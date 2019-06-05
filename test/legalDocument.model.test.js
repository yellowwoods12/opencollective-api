import { expect } from 'chai';
import { SequelizeValidationError } from 'sequelize';
import models from '../server/models';
import * as utils from '../test/utils';

const { LegalDocument, User, Collective } = models;

describe('LegalDocument model', () => {
  const documentData = {
    year: '2019',
  };

  const users = [
    {
      username: 'xdamman',
      email: 'xdamman@opencollective.com',
    },
    {
      username: 'piamancini',
      email: 'pia@opencollective.com',
    },
  ];
  const hostCollectiveData = {
    slug: 'myhost',
    name: 'myhost',
    currency: 'USD',
    tags: ['#brusselstogether'],
    tiers: [
      {
        name: 'backer',
        range: [2, 100],
        interval: 'monthly',
      },
      {
        name: 'sponsor',
        range: [100, 100000],
        interval: 'yearly',
      },
    ],
  };

  before(() => utils.resetTestDB());
  before(() => {
    return Promise.all([Collective.create(hostCollectiveData), User.createUserWithCollective(users[0])]);
  });

  it('can be created', async () => {
    const host = await Collective.findBySlug(hostCollectiveData.slug);
    const user = await User.findOne({
      where: {
        email: users[0].email,
      },
    });

    const userCollective = await models.Collective.findByPk(user.CollectiveId);

    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: host.id,
      CollectiveId: userCollective.id,
    });
    return expect(models.LegalDocument.create(legalDoc)).to.be.fulfilled;
  });
});