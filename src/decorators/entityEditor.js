/* eslint-disable */
import React from 'react';
import { container } from 're-app/decorators';
import { actions as entityEditorsActions } from 're-app/modules/entityEditors';
import { denormalize } from 'denormalizr';
import { getDenormalizedEntityGetter } from 're-app/selectors';
import hash from 'object-hash';

/**
 *
 *
 */
export default function entityEditor() {
	return function wrapWithEntityEditor(EntityEditorComponent) {

		@container(
			(state, props) => {
				const collectionName = props.routeParams.collectionName;
				const entityId = props.routeParams.id;


				const entitySchema = state.entityDescriptors.schemas[collectionName];
				//const entityMapping = state.entityDescriptors.mappings[collectionName];
				const entityFormFieldset = state.entityDescriptors.fieldsets[collectionName].form;
				const entityFormFields = entityFormFieldset || Object.keys(entitySchema.fields);

				//const entityDictionary = state.entityIndexes.entities[collectionName];
				//const entity = (entityDictionary && entityDictionary[entityId]) ? denormalize(entityDictionary[entityId], state.entityIndexes.entities, entityMapping) : null;
				const entity = getDenormalizedEntityGetter(collectionName, entityId)(state);

				return {
					entitySchema,
					entityFormFields,
					entity
				};
			},
			(dispatch, props) => {
				return {
					ensureCurrentEntity: () => {
						dispatch(entityEditorsActions.loadEntity(props.routeParams.collectionName, props.routeParams.id));
						//dispatch(entityIndexesActions.ensureEntity(props.routeParams.collectionName, props.routeParams.id));
					},
					//mergeEntity: (collectionName, entity) => {
					//	dispatch(entityIndexesActions.mergeEntity(collectionName, entity));
					//}
				};
			}
		)
		class EntityEditorContainer extends React.Component {

			componentDidMount() {
				const { ensureCurrentEntity } = this.props;
				ensureCurrentEntity();
			}

			render() {
				const { ensureCurrentEntity, ...otherProps } = this.props;
				return (
					<EntityEditorComponent {...otherProps} />
				);
			}
		}
		return EntityEditorContainer;
	};
}
