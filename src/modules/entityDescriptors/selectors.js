import _ from 'lodash';

export const getEntitySchemas = (state) => state.entityDescriptors ? state.entityDescriptors.schemas : undefined;
export const getEntityFieldsets = (state) => state.entityDescriptors ? state.entityDescriptors.fieldsets : undefined;
export const getEntitySchemaGetter = (collectionName) => (state) => {
	return _.get(state, ['entityDescriptors', 'schemas', collectionName]);
};

import { EntityAssociationFieldSchema } from './types';
import { validate } from 'tcomb-validation';
import { Schema, arrayOf } from 'normalizr';
export const getEntityMappingGetter = (collectionName) => (state) => {
	const schemas = _.get(state, ['entityDescriptors', 'schemas']);
	const schema = _.get(schemas, collectionName);
	if (!schema) {
		return undefined;
	}

	const mapping = new Schema(collectionName, {idAttribute: schema.idFieldName});
	try {
		_.each(schema.fields, (field) => {
			if (validate(field, EntityAssociationFieldSchema).isValid()) {
				//const assocMapping = mappings[field.collectionName];
				const fieldSchema = schemas[field.collectionName];
				if (!fieldSchema) {
					throw "unknownSchema";
				}
				const assocMapping = new Schema(field.collectionName, {idAttribute: fieldSchema.idFieldName});
				mapping.define({
					[field.name]: field.isMultiple ? arrayOf(assocMapping) : assocMapping
				});
			}
		});
	} catch (e) {
		if (e === "unknownSchema") {
			return undefined;
		}
		throw e;
	}
	return mapping;
};
