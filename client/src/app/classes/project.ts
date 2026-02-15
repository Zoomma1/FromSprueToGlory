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
}

