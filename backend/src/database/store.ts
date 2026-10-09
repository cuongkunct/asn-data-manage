// InMemoryStore has been retired. The application operates 100% directly with MongoDB Cloud Atlas.
export class InMemoryStore {
  users = [];
  customers = [];
  accounts = [];
  systemAccounts = [];
  notes = [];
  histories = [];
  configs = [];
}

export const store = new InMemoryStore();
