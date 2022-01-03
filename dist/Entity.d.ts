/**
 * Defines an interface that all entities must implement.
 * Includes common functionality for all entities.
 * @internal
 */
interface Entity {
    id: string;
    copy: () => Entity;
    equals: (entity: Entity) => boolean;
    toString: () => string;
}
export default Entity;
