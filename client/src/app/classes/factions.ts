export class Factions {
    factions: Faction[] = [];
}

export class Faction {
    id!: string;
    name!: string;
    gameSystemId!: string;
    gameSystem!: {
        name: string;
        slug: string;
    };
}
