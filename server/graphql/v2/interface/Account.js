import { invert } from 'lodash';

import { GraphQLBoolean, GraphQLInt, GraphQLString, GraphQLList, GraphQLInterfaceType } from 'graphql';

import { GraphQLDateTime } from 'graphql-iso-date';

import { idEncode } from '../identifiers';

import { HasMembersFields } from '../interface/HasMembers';
import { IsMemberOfFields } from '../interface/IsMemberOf';

import { MemberCollection, MemberOfCollection } from '../collection/MemberCollection';
import { TransactionCollection } from '../collection/TransactionCollection';
import { OrderCollection } from '../collection/OrderCollection';

import { AccountType, AccountTypeToModelMapping, ImageFormat, MemberRole, OrderStatus, TransactionType } from '../enum';

import { ChronologicalOrder } from '../input/ChronologicalOrder';

import { NotFound } from '../../errors';

import models, { Op } from '../../../models';

const accountTransactions = {
  type: TransactionCollection,
  args: {
    type: { type: TransactionType },
    limit: { type: GraphQLInt, defaultValue: 100 },
    offset: { type: GraphQLInt, defaultValue: 0 },
    orderBy: {
      type: ChronologicalOrder,
      defaultValue: ChronologicalOrder.defaultValue,
    },
  },
  async resolve(collective, args) {
    const where = { CollectiveId: collective.id };

    if (args.type) {
      where.type = args.type;
    }

    const result = await models.Transaction.findAndCountAll({
      where,
      limit: args.limit,
      offset: args.offset,
      order: [[args.orderBy.field, args.orderBy.direction]],
    });

    return { limit: args.limit, offset: args.offset, ...result };
  },
};

const accountOrders = {
  type: OrderCollection,
  args: {
    sent: { type: GraphQLBoolean, defaultValue: true },
    received: { type: GraphQLBoolean, defaultValue: true },
    limit: { type: GraphQLInt, defaultValue: 100 },
    offset: { type: GraphQLInt, defaultValue: 0 },
    status: { type: new GraphQLList(OrderStatus) },
    tierSlug: { type: GraphQLString },
    orderBy: {
      type: ChronologicalOrder,
      defaultValue: ChronologicalOrder.defaultValue,
    },
  },
  async resolve(collective, args) {
    let where;
    if (args.sent && args.received) {
      where = { [Op.or]: { CollectiveId: collective.id, FromCollectiveId: collective.id } };
    } else if (args.sent) {
      where = { FromCollectiveId: collective.id };
    } else if (args.received) {
      where = { CollectiveId: collective.id };
    } else {
      throw new NotFound({ message: 'At least one of `sent` or `received` needs to be true.' });
    }

    if (args.status && args.status.length > 0) {
      where.status = { [Op.in]: args.status };
    }

    if (args.tierSlug) {
      const tierSlug = args.tierSlug.toLowerCase();
      const tier = await models.Tier.findOne({ where: { CollectiveId: collective.id, slug: tierSlug } });
      if (!tier) {
        throw new NotFound({ message: 'TierSlug Not Found' });
      }
      where.TierId = tier.id;
    }

    const result = await models.Order.findAndCountAll({
      where,
      limit: args.limit,
      offset: args.offset,
      order: [[args.orderBy.field, args.orderBy.direction]],
    });

    return { limit: args.limit, offset: args.offset, ...result };
  },
};

export const AccountFields = {
  // _internal_id: {
  //   type: GraphQLInt,
  //   resolve(transaction) {
  //     return transaction.id;
  //   },
  // },
  id: {
    type: GraphQLString,
    resolve(collective) {
      return idEncode(collective.id, 'account');
    },
  },
  slug: {
    type: GraphQLString,
    resolve(collective) {
      return collective.slug;
    },
  },
  type: {
    type: AccountType,
    resolve(collective) {
      return invert(AccountTypeToModelMapping)[collective.type];
    },
  },
  name: {
    type: GraphQLString,
    resolve(collective) {
      return collective.name;
    },
  },
  description: {
    type: GraphQLString,
    resolve(collective) {
      return collective.description;
    },
  },
  website: {
    type: GraphQLString,
    resolve(collective) {
      return collective.website;
    },
  },
  twitterHandle: {
    type: GraphQLString,
    resolve(collective) {
      return collective.twitterHandle;
    },
  },
  githubHandle: {
    type: GraphQLString,
    resolve(collective) {
      return collective.githubHandle;
    },
  },
  imageUrl: {
    type: GraphQLString,
    args: {
      height: { type: GraphQLInt },
      format: {
        type: ImageFormat,
      },
    },
    resolve(collective, args) {
      return collective.getImageUrl(args);
    },
  },
  createdAt: {
    type: GraphQLDateTime,
    resolve(collective) {
      return collective.createdAt;
    },
  },
  updatedAt: {
    type: GraphQLDateTime,
    resolve(collective) {
      return collective.updatedAt || collective.createdAt;
    },
  },
  // stats: {
  //   type: AccountStats,
  //   resolve(collective) {
  //     return collective;
  //   },
  // },
  ...HasMembersFields,
  ...IsMemberOfFields,
  transactions: accountTransactions,
  orders: accountOrders,
};

export const Account = new GraphQLInterfaceType({
  name: 'Account',
  description: 'Account interface shared by all kind of accounts (Bot, Collective, Event, User, Organization)',
  fields: () => {
    return {
      // _internal_id: {
      //   type: GraphQLInt,
      //   description: 'The internal database identifier (should not be public)',
      // },
      id: {
        type: GraphQLString,
        description: 'The public id identifying the account (ie: 5v08jk63-w4g9nbpz-j7qmyder-p7ozax5g)',
      },
      slug: {
        type: GraphQLString,
        description: 'The slug identifying the account (ie: babel)',
      },
      type: {
        type: AccountType,
        description: 'The type of the account (BOT/COLLECTIVE/EVENT/ORGANIZATION/INDIVIDUAL)',
      },
      name: {
        type: GraphQLString,
      },
      description: {
        type: GraphQLString,
      },
      website: {
        type: GraphQLString,
      },
      twitterHandle: {
        type: GraphQLString,
      },
      githubHandle: {
        type: GraphQLString,
      },
      imageUrl: {
        type: GraphQLString,
        args: {
          height: { type: GraphQLInt },
          format: {
            type: ImageFormat,
          },
        },
      },
      createdAt: {
        type: GraphQLDateTime,
        description: 'The time of creation',
      },
      updatedAt: {
        type: GraphQLDateTime,
        description: 'The time of last update',
      },
      // stats: {
      //   type: AccountStats,
      // },
      members: {
        type: MemberCollection,
        args: {
          limit: { type: GraphQLInt, defaultValue: 100 },
          offset: { type: GraphQLInt, defaultValue: 0 },
          role: { type: new GraphQLList(MemberRole) },
          accountType: {
            type: new GraphQLList(AccountType),
            description: 'Type of accounts (BOT/COLLECTIVE/EVENT/ORGANIZATION/INDIVIDUAL)',
          },
        },
      },
      memberOf: {
        type: MemberOfCollection,
        args: {
          limit: { type: GraphQLInt, defaultValue: 100 },
          offset: { type: GraphQLInt, defaultValue: 0 },
          role: { type: new GraphQLList(MemberRole) },
          accountType: {
            type: new GraphQLList(AccountType),
            description: 'Type of accounts (BOT/COLLECTIVE/EVENT/ORGANIZATION/INDIVIDUAL)',
          },
        },
      },
      transactions: {
        type: TransactionCollection,
        args: {
          limit: { type: GraphQLInt, defaultValue: 100 },
          offset: { type: GraphQLInt, defaultValue: 0 },
          type: {
            type: TransactionType,
            description: 'Type of transaction (DEBIT/CREDIT)',
          },
          orderBy: {
            type: ChronologicalOrder,
          },
        },
      },
      orders: {
        type: OrderCollection,
        args: {
          limit: { type: GraphQLInt, defaultValue: 100 },
          offset: { type: GraphQLInt, defaultValue: 0 },
          status: { type: new GraphQLList(OrderStatus) },
          tierSlug: { type: GraphQLString },
          orderBy: {
            type: ChronologicalOrder,
          },
        },
      },
    };
  },
});

export default Account;
