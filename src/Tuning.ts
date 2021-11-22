let _tuning: { [key: string]: any } = {
  a4: 440,
};

const tuning = (tuning?: { [key: string]: any }): { [key: string]: any } => {
  if (tuning) {
    _tuning = { ..._tuning, ...tuning };
  }

  return _tuning;
};

export default tuning;
