// @flow
export type EntityIndexFilter = void | {
	offset?: number,
	limit?: number,
	page: void,
	order?: Array<string>
};
