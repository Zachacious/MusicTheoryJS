interface Entity {
   id: string;
   copy: () => Entity;
   equals: (entity: Entity) => boolean;
   toString: () => string;
}

export default Entity;
