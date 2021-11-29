interface Entity {
    id: string;
    copy: () => Entity;
    equals: (entity: Entity) => boolean;
}
export default Entity;
