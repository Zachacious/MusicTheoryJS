import { uid } from "uid";

const CIdentifiable: Function = () => {
  return (target: any) => {
    target.prototype.id = (id?: string) => {
      if (target.prototype._id === undefined) target.prototype._id = uid();

      if (id) {
        target.prototype._id = id;
      }

      return target.prototype._id;
    };
  };
};

export default CIdentifiable;
