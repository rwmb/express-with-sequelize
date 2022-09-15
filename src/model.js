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
   * Gets the sum of the price of all unpaid jobs from active contracts
   * 
   * @returns { number } The sum of the price of all Jobs not yet paid
   */
  async getUnpaidJobsPrice() {
    if (!this.id) throw new Error('Profile not initialized.');
  
    const clause = this.type === 'client' // should be Enum
      ? { ClientId: this.id }
      : { ContractorId: this.id };

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum

    const result = await Contract.findAll({
      where: clause,
      include: {
        model: Job,
        where: { paid: false }
      },
    });

    console.log(result);
    
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
    console.log('profile', profile);
    const clause = profile.type === 'client' // should be Enum
      ? { ClientId: profile.id }
      : { ContractorId: profile.id };

    clause['status'] = { [Sequelize.Op.not]: 'terminated' }; // both should be Enum

    const contracts = await Contract.findAll({where: clause});

    return contracts;
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

class Job extends Sequelize.Model {

  /**
   * Pays for a Job with the Client informatio provided.
   * 
   * @param {sequelize.Profile} client The Client paying for the Job
   * @returns {{ job: sequelize.Job, profile: sequelize.Profile }} The updated Job and Profile of the Client that made the request
   */
  async pay(client) {
    const transaction = await sequelize.transaction();
    try {
      const response = {};
  
      if (!this.id) throw new Error('Job not initialized.');
      if (this.paid) throw new Error('Job already paid.');
      if (client.balance < this.price) throw new Error('Insufficient balance.');

      const contract = await Contract.findByPk(this.ContractId); // more contract verifications if necessary
      const contractor = await Profile.findByPk(contract.ContractorId);
    
      this.paid = true;
      this.paymentDate = '2020-08-15T19:11:26.737Z'; // TODO: correct current time here
      await this.save();

      client.balance -= this.price;
      await client.save();

      contractor.balance += this.price;
      await contractor.save();

      await transaction.commit();

      response['job'] = this;
      response['profile'] = client;
    
      return response;
    } catch (error) {
      await transaction.rollback();
      throw new Error('Error paying Job: ' + this.id);
    }
  }
}
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
