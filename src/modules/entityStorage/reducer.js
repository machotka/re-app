import _ from 'lodash';
import invariant from 'invariant';
import Immutable from 'seamless-immutable';
import t from 'tcomb';

import { createReducer } from 're-app/utils';

import {
	ENSURE_ENTITY,
	ATTEMPT_FETCH_ENTITY,
	RECEIVE_ENTITY,
	RECEIVE_ENTITIES,
	RECEIVE_FETCH_ENTITY_FAILURE,
	MERGE_ENTITY,
	PERSIST_ENTITY,
	RECEIVE_PERSIST_ENTITY_SUCCESS,
	RECEIVE_PERSIST_ENTITY_FAILURE,
	DELETE_ENTITY,
	RECEIVE_DELETE_ENTITY_SUCCESS,
	RECEIVE_DELETE_ENTITY_FAILURE,
} from './actions';

import type { Error } from 'types/Error';
import type { EntitySchema } from 'types/EntitySchema';
import type { CollectionName } from 'types/CollectionName';
import type { EntityId } from 'types/EntityId';
import type { EntityStatus } from 'types/EntityStatus';
import type { NormalizedEntityDictionary } from 'types/NormalizedEntityDictionary';
const ReceiveEntityActionPayload = t.refinement(
	t.struct({
		collectionName: CollectionName,
		entityId: EntityId,
		normalizedEntities: NormalizedEntityDictionary,
		validAtTime: t.String,
	}),
	(x) => {
		const requestedEntityPresent = _.get(
				x.normalizedEntities,
				[x.collectionName, x.entityId]
			) === x.entityId;
		// TODO const entitiesProperlyNormalized =
		return requestedEntityPresent;
	},
	'ReceiveEntityActionPayload'
);
const ReceiveEntitiesActionPayload = t.struct({
	normalizedEntities: NormalizedEntityDictionary,
	validAtTime: t.String,
});

const defaultStatus = {
	transient: false,
	fetching: false,
	persisting: false,
	deleting: false,
};

function setEntitiesToState(state, normalizedEntities) {
	return state.update('collections', (currentValue, collections) => {
		let newValue = currentValue;
		_.each(collections, (entities, collectionName) => {
			_.each(entities, (entity, entityId) => {
				newValue = newValue.setIn(
					[collectionName, entityId],
					_.assign(
						{},
						_.get(newValue, [collectionName, entityId], {}),
						entity
					)
				);
			});
		});
		return newValue;
	}, normalizedEntities);
}

function setStatusWithDefaults(state, collectionName, entityId, getNewStatus) {
	return state.updateIn(
		['statuses', collectionName, entityId],
		(currentStatus) => _.merge({}, defaultStatus, currentStatus, getNewStatus(currentStatus))
	);
}

export default createReducer(
	t.struct({
		collections: NormalizedEntityDictionary,
		statuses: t.dict(CollectionName, t.dict(EntityId, t.maybe(EntityStatus))),
		errors: t.dict(CollectionName, t.dict(EntityId, t.maybe(t.Object))),
	}),
	Immutable.from({
		collections: {},
		statuses: {},
		errors: {},
	}),
	{
		[ENSURE_ENTITY]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
			}),
			(state, action) => {
				const { collectionName, entityId } = action.payload;
				return setStatusWithDefaults(state, collectionName, entityId, (currentStatus) => ({
					transient: currentStatus ? currentStatus.transient : true,
				}));
			},
		],
		[ATTEMPT_FETCH_ENTITY]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
			}),
			(state, action) => {
				const { collectionName, entityId } = action.payload;
				return setStatusWithDefaults(state, collectionName, entityId, (currentStatus) => ({
					transient: currentStatus ? currentStatus.transient : true,
					fetching: true,
				}));
			},
		],
		[RECEIVE_ENTITY]: [
			ReceiveEntityActionPayload,
			(state, action) => {
				const {
					normalizedEntities,
					validAtTime,
				} = action.payload;

				let newState = state;
				newState = newState.merge({
					collections: normalizedEntities,
					statuses: _.mapValues(
						normalizedEntities,
						(entityList, statusCollectionName) => _.mapValues(entityList, (x, statusEntityId) => {
							const currentStatus = _.get(
								state,
								['statuses', statusCollectionName, statusEntityId],
								{}
							);
							return _.merge({}, defaultStatus, currentStatus, {
								validAtTime,
								transient: false,
							});
						})
					),
				}, { deep: true });

				return newState;
			},
		],
		[RECEIVE_ENTITIES]: [
			ReceiveEntitiesActionPayload,
			(state, action) => {
				const { normalizedEntities, validAtTime } = action.payload;

				let newState = state;
				newState = setEntitiesToState(state, normalizedEntities);
				newState = newState.merge({
					statuses: _.mapValues(
						normalizedEntities,
						(entityList, statusCollectionName) => _.mapValues(entityList, (x, statusEntityId) => {
							const currentStatus = _.get(
								state,
								['statuses', statusCollectionName, statusEntityId]
							);
							return _.merge({}, defaultStatus, currentStatus, {
								validAtTime,
								transient: false,
								fetching: false,
							});
						})
					),
				}, { deep: true });

				return newState;
			},
		],
		[RECEIVE_FETCH_ENTITY_FAILURE]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
				error: Error,
			}),
			(state, action) => {
				const { collectionName, entityId, error } = action.payload;
				let newState = state;
				newState = setStatusWithDefaults(newState, collectionName, entityId, () => ({
					transient: true,
					fetching: false,
				}));
				newState = newState.setIn(['errors', collectionName, entityId], error);
				return newState;
			},
		],
		[MERGE_ENTITY]: [
			t.struct({
				collectionName: t.String,
				data: t.Object,
				noInteraction: t.Boolean,
			}),
		],
		[PERSIST_ENTITY]: [
			t.struct({
				entitySchema: EntitySchema,
				entityId: EntityId,
				entity: t.Object,
				noInteraction: t.Boolean,
			}),
			(state, action) => {
				const { entitySchema, entityId, entity } = action.payload;
				const collectionName = entitySchema.name;

				let newState = state;
				newState = newState.updateIn(
					['collections', collectionName, entityId],
					(value, newEntity) => {
						let newValue = value;
						if (!newValue) {
							newValue = Immutable.from({});
						}
						return newValue.merge(
							{
								...newEntity,
								[entitySchema.idFieldName]: entityId,
							}
						);
					},
					entity
				);
				newState = setStatusWithDefaults(newState, collectionName, entityId, (currentStatus) => ({
					persisting: true,
					transient: currentStatus ? currentStatus.transient : true,
				}));

				newState = newState.setIn(
					['errors', collectionName, entityId],
					{}
				);

				return newState;
			},
		],
		[RECEIVE_PERSIST_ENTITY_SUCCESS]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
				normalizedEntities: NormalizedEntityDictionary,
				validAtTime: t.String,
				transientEntityId: t.maybe(EntityId),
			}),
			(state, action) => {
				const {
					collectionName,
					normalizedEntities,
					transientEntityId,
					validAtTime,
				} = action.payload;

				let newState = setEntitiesToState(state, normalizedEntities);

				const statuses = _.mapValues(
					normalizedEntities,
					(entityList) => _.mapValues(entityList, () => ({
						validAtTime,
						persisting: false,
						transient: false,
					}))
				);

				newState = newState.merge({
					statuses,
				}, { deep: true });

				if (transientEntityId) {
					newState = newState.setIn(
						['collections', collectionName],
						newState.collections[collectionName].without(transientEntityId)
					);
					newState = newState.setIn(
						['statuses', collectionName],
						newState.statuses[collectionName].without(transientEntityId)
					);
				}
				return newState;
			},
		],
		[RECEIVE_PERSIST_ENTITY_FAILURE]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
				error: t.Object,
			}),
			(state, action) => {
				const { collectionName, entityId, error } = action.payload;

				const isTransient = _.get(
					state,
					['statuses', collectionName, entityId, 'transient'],
					false
				);

				let newState = state.merge({
					statuses: {
						[collectionName]: {
							[entityId]: {
								transient: isTransient,
								persisting: false,
							},
						},
					},
					errors: {
						[collectionName]: {
							[entityId]: error,
						},
					},
				}, { deep: true });

				if (error.validationErrors) {
					newState = newState.merge({
						validationErrors: {
							[collectionName]: {
								[entityId]: error.validationErrors,
							},
						},
					}, { deep: true });
				}
				return newState;
			},
		],
		[DELETE_ENTITY]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
			}),
			(state, action) => {
				const { collectionName, entityId } = action.payload;
				invariant(
					_.get(state, ['collections', collectionName, entityId]),
					'unknown entity to delete'
				);
				return state.merge({
					statuses: {
						[collectionName]: {
							[entityId]: {
								transient: true,
								deleting: true,
							},
						},
					},
				}, { deep: true });
			},
		],
		[RECEIVE_DELETE_ENTITY_SUCCESS]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
			}),
			(state, action) => {
				const { collectionName, entityId } = action.payload;
				return state
					.setIn(
						['collections', collectionName],
						state.collections[collectionName].without(`${entityId}`)
					)
					.setIn(
						['statuses', collectionName],
						state.statuses[collectionName].without(`${entityId}`)
					);
			},
		],
		[RECEIVE_DELETE_ENTITY_FAILURE]: [
			t.struct({
				collectionName: t.String,
				entityId: EntityId,
				error: Error,
			}),
			(state, action) => {
				const { collectionName, entityId, error } = action.payload;
				return state.merge({
					statuses: {
						[collectionName]: {
							[entityId]: {
								error,
								transient: false,
								deleting: false,
							},
						},
					},
				}, { deep: true });
			},
		],
	},
	'entityStorage'
);
