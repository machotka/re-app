import _ from 'lodash';

export const isInitialized = (state) => state.entityDescriptors.initialized;
export const getEntityDefinitions = (state) =>
	(state.entityDescriptors ? state.entityDescriptors.definitions : undefined);
export const getEntityFieldsets = (state) =>
	(state.entityDescriptors ? state.entityDescriptors.fieldsets : undefined);
export const getEntityDefinitionSelector = (modelName) =>
	(state) =>
		_.get(state, ['entityDescriptors', 'definitions', modelName]);
