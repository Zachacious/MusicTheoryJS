import { uid } from "uid";

const CIdentifiable: Function = () => {
  return (target: any) => {
    return (target.prototype.id = (id: string = "") => {
      id ? (target.prototype.id = id) : (target.prototype.id = uid(10));
      return target.prototype.id;
    });
  };
};

export default CIdentifiable;
