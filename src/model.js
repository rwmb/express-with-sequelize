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
  
    const clause = Contract.getProfileIdClause(this);
    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum
    const result = await Contract.findAll({
      where: clause,
      include: {
        model: Job,
        as: 'Jobs',
        where: { paid: { [Sequelize.Op.not]: true } }
      },
    });

    const response = [];
  
    result.forEach((currentContract) => response.push(...currentContract.get('Jobs')));
    
    return response;
  }

  /**
   * Gets the sum of the price of all unpaid jobs from active contracts
   * 
   * @returns { number } The sum of the price of all Jobs not yet paid
   * TODO:
   */
  async getUnpaidJobsAmount() {
    if (!this.id) throw new Error('Profile not initialized.');

    const clause = Contract.getProfileIdClause(this);

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum
  
    const contracts = await Contract.findAll({
      where: clause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('Jobs.price')), 'totalContractAmount'],
      ],
      include: {
        model: Job,
        as: 'Jobs',
        where: { paid: { [Sequelize.Op.not]: true } }
      },
    });
    let sum = 0;
    
    sum = contracts.reduce((previous, currentContract) => previous + currentContract.totalContractAmount, sum);
    
    return sum;
  }
  
  /**
   * Gets the best profession during the searched period
   * 
   * @param { sequelize.DATE } startDate The startDate in the time range to search
   * @param { sequelize.DATE } endDate The endDate in the time range to search
   * @returns { { profession: string, amountEarned: number } }
   */
  static async getBestProfession(startDate, endDate) {
    const profiles = await Profile.findAll({
      attributes: [
        'profession',
        [Sequelize.fn('SUM', Sequelize.col('Contractor->Jobs.price')), 'totalAmountEarned']
      ],
      order: [['totalAmountEarned', 'DESC']],
      group: ['profession'],
      subQuery:false,
      limit: 1,
      where: [{ type: 'contractor' }],
      include: {
        model: Contract,
        as: 'Contractor',
        include: {
          model: Job,
          as: 'Jobs',
          where: {
            paymentDate: {
              [Sequelize.Op.between]: [startDate, endDate],
            }
          },
        }
      }
    });

    const bestProfession = profiles?.at(0);

    const result = {
      profession: bestProfession.get('profession'),
      amountEarned: bestProfession.get('totalAmountEarned')
    };

    return result;
  }


  /**
   * Gets the best client during the searched period
   * 
   * @param { sequelize.DATE } startDate The startDate in the time range to search
   * @param { sequelize.DATE } endDate The endDate in the time range to search
   * @param { number } limit The limit of entries to load
   * @returns { { id: string, fullName: string, paid: number } }
   */
  static async getBestClients(startDate, endDate, limit = 2) {
    const clients = await Profile.findAll({
      attributes: [
        'id', 'profession', 'firstName', 'lastName',
        [Sequelize.fn('SUM', Sequelize.col('Client->Jobs.price')), 'totalAmountPaid']
      ],
      order: [['totalAmountPaid', 'DESC']],
      group: ['Profile.id'],
      subQuery:false,
      limit,
      where: [{ type: 'client' }],
      include: {
        model: Contract,
        as: 'Client',
        include: {
          model: Job,
          as: 'Jobs',
          where: {
            paymentDate: {
              [Sequelize.Op.between]: [startDate, endDate],
            }
          },
        }
      }
    });

    const result = [];
    clients.forEach((entry) => {
      result.push({
        id: entry.id,
        // could be done with template literals but this approach is cleaner
        fullName: entry.get('firstName') + ' ' + entry.get('lastName'),
        paid: entry.get('totalAmountPaid'),
      });
    });

    return result;
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
    const clause = Contract.getProfileIdClause(profile);

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum

    const contracts = await Contract.findAll({where: clause});

    return contracts;
  }

  /**
   * Gets the Sequelize Clause Object to request the Contracts based on the profile
   * @param { sequelize.Profile } profile The profile making the request
   * @returns { { [key: string]: profile.id } } The Clause to make the Contract search based on the profile
   */
  static getProfileIdClause(profile) {
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
