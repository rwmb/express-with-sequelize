const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite3'
});

class Profile extends Sequelize.Model {
  
  /**
   * Deposits money into the balance of the active profile
   * 
   * @param { number } amount Amount to be deposited
   */
  async deposit(amount) {
    if (!this.id) throw new Error('Profile not initialized.');

    this.balance += amount;
    await this.save();  
  }

  /**
   * Pays for a Job
   * 
   * @param { string } jobId The Job ID
   * @returns {{ job: sequelize.Job, profile: sequelize.Profile }} The updated Job and Profile of the Client that made the request
   */
  async pay(jobId) {
    const transaction = await sequelize.transaction();
    try {
      const response = {};
      if (this.type !== 'client') throw new Error('Contractors cannot pay for jobs.');
  
      const contractor = await Profile.findOne({
        include: {
          model: Contract,
          as: 'Contractor',
          where: {
            ClientId: this.id
          },
          include: {
            model: Job,
            as: 'Jobs',
            where: { id: jobId }
          },
        }
        
      });

      const contract = contractor?.get('Contractor')?.at(0);
      const job = contract?.get('Jobs')?.at(0);

      if(!contractor || !contract || !job) throw new Error('Job not found');
      if (contract.status === 'terminated') throw new Error('Cannot pay for terminated contracts');

      if (job.paid) throw new Error('Job already paid.');
      if (this.balance < job.price) throw new Error('Insufficient balance.');
    
      job.paid = true;
      job.paymentDate = new Date();
      await job.save();

      this.balance -= job.price;
      await this.save();

      contractor.balance += job.price;
      await contractor.save();

      await transaction.commit();

      response['job'] = job;
      response['profile'] = this;
    
      return response;
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      throw new Error('Error paying Job: ' + this.id);
    }
  }

  /**
   * Gets the list of unpaid jobs from active contracts
   * 
   * @returns { number } The list of Jobs not yet paid
   */
  async getUnpaidJobs() {
    if (!this.id) throw new Error('Profile not initialized.');
  
    const clause = Contract.getContractClause(this);

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum
    clause['$Jobs.paid$'] = { [Sequelize.Op.not]: true };
    const result = await Contract.findAll({
      where: clause,
      include: {
        model: Job,
        as: 'Jobs',
      },
    });

    const response = [];
  
    result.forEach((currentContract) => response.push(...currentContract.get('Jobs')));
    
    return response;
  }
  
  static async getBestProfession(startDate, endDate) {
    const profiles = await Profile.findAll({
      order: [['amountMade', 'DESC']],
      attributes: [
        'profession',
        [Sequelize.fn('SUM', Sequelize.col('Contracts.totalMadeOnContract')), 'totalMade'],
      ],
      group: ['profession'],
      include: {
        model: Contract,
        as: 'Contracts',
        attributes: [
          'id',
          [Sequelize.fn('SUM', Sequelize.col('Jobs.price')), 'totalMadeOnContract'],
        ],
        include: {
          model: Job,
          as: 'Jobs',
          where: {
            paymentDate: {
              [Sequelize.Op.between]: [startDate, endDate]
            }
          }
        }
      }
    });
    
    return profiles;
  }

  /**
   * Gets the sum of the price of all unpaid jobs from active contracts
   * 
   * @returns { number } The sum of the price of all Jobs not yet paid
   */
  async getUnpaidJobsPrice() {
    if (!this.id) throw new Error('Profile not initialized.');

    const clause = Contract.getContractClause(this);
    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum
    clause['$Jobs.paid$'] = { [Sequelize.Op.not]: true };
    const contracts = await Contract.findAll({
      where: clause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('Jobs.price')), 'totalContractAmount'],
      ],
      include: {
        model: Job,
        as: 'Jobs',
      },
    });

    let sum = 0;
    
    sum = contracts.reduce((previous, currentContract) => previous + currentContract.totalContractAmount, sum);
    
    return sum;
  }
}

Profile.init(
  {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    profession: {
      type: Sequelize.STRING,
      allowNull: false
    },
    balance:{
      type:Sequelize.DECIMAL(12,2)
    },
    type: {
      type: Sequelize.ENUM('client', 'contractor')
    }
  },
  {
    sequelize,
    modelName: 'Profile'
  }
);

class Contract extends Sequelize.Model {

  /**
   * Gets all active Contracts for a specific profile
   * 
   * @param { sequelize.Profile } profile The profile on which to run the operation against
   * @returns { sequelize.Contract[] } All active Contracts that the profile has access to
   */
  static async getAll(profile) {
    const clause = Contract.getContractClause(profile);

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum

    const contracts = await Contract.findAll({where: clause});

    return contracts;
  }

  /**
   * Gets the Sequelize Clause Object to request the Contracts based on the profile
   * @param { sequelize.Profile } profile The profile making the request
   * @returns { { [key: string]: profile.id } } The Clause to make the Contract search based on the profile
   */
  static getContractClause(profile) {
    return profile.type === 'client' // should be Enum
      ? { ClientId: profile.id }
      : { ContractorId: profile.id };
  }
}
Contract.init(
  {
    terms: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status:{
      type: Sequelize.ENUM('new','in_progress','terminated')
    }
  },
  {
    sequelize,
    modelName: 'Contract'
  }
);

class Job extends Sequelize.Model {}
Job.init(
  {
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    price:{
      type: Sequelize.DECIMAL(12,2),
      allowNull: false
    },
    paid: {
      type: Sequelize.BOOLEAN,
      default:false
    },
    paymentDate:{
      type: Sequelize.DATE
    }
  },
  {
    sequelize,
    modelName: 'Job'
  }
);

Profile.hasMany(Contract, {as :'Contractor',foreignKey:'ContractorId'});
Contract.belongsTo(Profile, {as: 'Contractor'});

Profile.hasMany(Contract, {as : 'Client', foreignKey:'ClientId'});
Contract.belongsTo(Profile, {as: 'Client'});

Contract.hasMany(Job);
Job.belongsTo(Contract);

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job
};
