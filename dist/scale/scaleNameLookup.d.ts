/**
 * Will lookup a scale name based on the template.
 * @param template - the template to lookup
 * @param supressWarning - supress the warning for ineffeciency if true
 * @returns the scale name
 * @internal
 */
declare const scaleNameLookup: (template: number[], supressWarning?: boolean) => string;
export default scaleNameLookup;
