import _ from "lodash";

export function pickTruthy<T extends Record<string, any>>(obj: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => {
            return value !== undefined &&
                value !== null &&
                value !== '' && !(Array.isArray(value) && value.length === 0)
        })
    ) as Partial<T>;
}