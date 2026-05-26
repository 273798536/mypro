import { DataStore } from '../models/store';
import { WalletAddress, Owner } from '../models/types';

export class AddressMerger {
  private store: DataStore;

  constructor() {
    this.store = DataStore.getInstance();
  }

  mergeAddresses(addressIds: string[], targetOwnerId?: string, reason: string = 'manual_merge'): Owner {
    const addresses = addressIds
      .map(id => this.store.getAddress(id))
      .filter((a): a is WalletAddress => a !== undefined);

    if (addresses.length === 0) {
      throw new Error('No valid addresses provided');
    }

    let targetOwner: Owner;

    if (targetOwnerId) {
      const existing = this.store.getOwner(targetOwnerId);
      if (!existing) {
        throw new Error(`Owner ${targetOwnerId} not found`);
      }
      targetOwner = existing;
    } else {
      const existingOwners = [...new Set(addresses.map(a => a.ownerId).filter(Boolean))];
      if (existingOwners.length > 0) {
        const firstOwner = this.store.getOwner(existingOwners[0]);
        if (firstOwner) {
          targetOwner = firstOwner;
        } else {
          targetOwner = this.createNewOwner(addresses);
        }
      } else {
        targetOwner = this.createNewOwner(addresses);
      }
    }

    addresses.forEach(address => {
      this.store.updateAddress(
        address.id,
        { ownerId: targetOwner.id },
        reason,
        'system'
      );
    });

    return targetOwner;
  }

  private createNewOwner(addresses: WalletAddress[]): Owner {
    const label = addresses[0]?.label || 'Unknown';
    return this.store.addOwner({
      name: `Owner - ${label.substring(0, 20)}`,
      addresses: addresses.map(a => a.id)
    });
  }

  autoDetectSameOwner(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const allAddresses = this.store.getAllAddresses();

    for (const addr of allAddresses) {
      if (addr.label.includes('Deposit') || addr.label.includes('Hot')) {
        const exchangeName = addr.exchangeName || 'Unknown';
        const key = `exchange:${exchangeName}`;
        if (!clusters.has(key)) {
          clusters.set(key, []);
        }
        clusters.get(key)!.push(addr.id);
      }
    }

    return clusters;
  }

  getOrCreateOwner(name: string): Owner {
    const existing = this.store.getAllOwners().find(o => o.name === name);
    if (existing) return existing;
    return this.store.addOwner({ name, addresses: [] });
  }

  getAddressSummary(): Array<{
    owner: Owner | null;
    addresses: WalletAddress[];
    count: number;
  }> {
    const ownerMap = new Map<string, WalletAddress[]>();
    const unassigned: WalletAddress[] = [];

    for (const addr of this.store.getAllAddresses()) {
      if (addr.ownerId) {
        if (!ownerMap.has(addr.ownerId)) {
          ownerMap.set(addr.ownerId, []);
        }
        ownerMap.get(addr.ownerId)!.push(addr);
      } else {
        unassigned.push(addr);
      }
    }

    const result: Array<{
      owner: Owner | null;
      addresses: WalletAddress[];
      count: number;
    }> = [];

    for (const [ownerId, addresses] of ownerMap) {
      result.push({
        owner: this.store.getOwner(ownerId) || null,
        addresses,
        count: addresses.length
      });
    }

    if (unassigned.length > 0) {
      result.push({
        owner: null,
        addresses: unassigned,
        count: unassigned.length
      });
    }

    return result;
  }
}
