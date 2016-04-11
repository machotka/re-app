/* eslint-disable */
import React from 'react';
import { container } from 're-app/decorators';
import { actions as entityIndexActions } from 're-app/modules/entityIndexes';
import { actions as routingActions } from 're-app/modules/routing';
import hash from 'object-hash';
import { denormalize } from 'denormalizr';
import update from 'immutability-helper';
update.extend('$delete', (value, original) => {
	const result = update(original, {[value]: {$set: undefined}});
	delete result[value];
	return result;
});

/**
 *
 *
 */
export default function entityIndex() {
	return function wrapWithEntityIndex(EntityIndexComponent) {

		@container(
			(state, props) => {
				const defaultLimit = 10;
				const collectionName = props.routeParams.collectionName;
				let { filter } = props.location.query;
				let page = _.get(filter, 'page', 1);
				const existingCount = state.entityIndexes.existingCounts[collectionName];
				let internalFilter = update(filter || {}, {
					$delete: 'page'
				});
				internalFilter = update(internalFilter, {
					offset: {$set: (page - 1) * defaultLimit},
					limit: {$set: defaultLimit}
				});

				const indexHash = hash({
					collectionName,
					filter: internalFilter
				});
				const entityIndex = state.entityIndexes.indexes[indexHash];
				const entityDictionary = state.entityIndexes.entities[collectionName];
				const entitySchema = state.entityDescriptors.schemas[collectionName];
				const entityMapping = state.entityDescriptors.mappings[collectionName];
				const entityGridFieldset = state.entityDescriptors.fieldsets[collectionName].grid;
				const entityGridFields = entityGridFieldset || Object.keys(entitySchema.fields);

				// TODO switch to denormalize arrayOf when supported
				const entities = (entityIndex ? entityIndex.index.map((id) => {
					return denormalize(entityDictionary[id], state.entityIndexes.entities, entityMapping);
				}) : []);


				return {
					entitySchema,
					entityGridFields,
					entities,
					errors: entityIndex && entityIndex.errors,
					existingCount,
					fetching: entityIndex && entityIndex.fetching,
					ready: entityIndex && entityIndex.ready,
					filter: internalFilter
				};
			},
			(dispatch, props) => {
				return {
					ensureEntityIndex: (collectionName, filter) => {
						dispatch(entityIndexActions.ensureEntityIndex(collectionName, filter));
					},
					handleFilterChange(filter) {
						const filterResult = update(filter, {
							'offset': {'$set': undefined},
							'limit': {'$set': undefined},
							'page': {
								'$apply': () => {
									return (filter.offset / filter.limit) + 1
								}
							}
						});

						dispatch(routingActions.navigate({
							name: 'entity_index',
							params: {collectionName: props.routeParams.collectionName},
							query: {filter: filterResult}
						}))
					}
				};
			}
		)
		class EntityIndexContainer extends React.Component {

			componentDidMount() {
				const { ensureEntityIndex, entitySchema, filter } = this.props;
				ensureEntityIndex(entitySchema.name, filter);
			}

			render() {
				return (
					<EntityIndexComponent {...this.props} />
				);
			}
		}
		return EntityIndexContainer;
	};
}
