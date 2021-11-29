declare const Copyable: <T extends {
    id: string;
}>(target: T) => () => T;
export default Copyable;
