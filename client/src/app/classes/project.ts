import { Item, ItemStatus } from './items';

export class Projects {
    projects: Project[] = [];
}

export class Project {
    id!: string;
    userId!: string;
    name!: string;
    description!: string | null;
    createdAt!: string;
    updatedAt!: string;
    items?: Item[];
    completion?: number;
    itemCount?: number;
    statusCounts?: Partial<Record<ItemStatus, number>>;
}
