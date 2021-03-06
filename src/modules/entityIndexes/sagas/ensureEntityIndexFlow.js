// @flow

import hash from 'object-hash';
import moment from 'moment';

import { apiServiceResultTypeInvariant } from 're-app/utils';
import type { EntityIndexResult } from 'types/EntityIndexResult';
import type { Error } from 'types/Error';

import { take, call, select, put, fork } from 'redux-saga/effects';
import normalize from 'modules/entityDescriptors/utils/normalize';
import normalizeFilter from 'modules/entityIndexes/utils/normalizeFilter';
import {
	getApiContext,
	getApiService,
} from 'modules/api/selectors';
import {
	getAuthContext,
} from 'modules/auth/selectors';
import {
	getEntitySchemas,
} from 'modules/entityDescriptors/selectors';
import {
	ENSURE_ENTITY_INDEX,
	attemptFetchEntityIndex,
	receiveEntityIndex,
	fetchEntityIndexFailure,
} from '../actions';

import {
	receiveEntities,
} from 'modules/entityStorage/actions';

export function *ensureEntityIndexTask(action) {
	const { collectionName, filter } = action.payload;
	const indexHash = hash({ collectionName, filter });
	const apiContext = yield select(getApiContext);
	const ApiService = yield select(getApiService);
	const authContext = yield select(getAuthContext);
	// const { collectionName, filter } = yield select(getEntityIndexSelector(indexHash));
	yield put(attemptFetchEntityIndex(indexHash));
	try {
		const normalizedFilter = normalizeFilter(filter);
		const result = yield call(
			ApiService.getEntityIndex,
			collectionName,
			normalizedFilter,
			apiContext,
			authContext
		);
		apiServiceResultTypeInvariant(result, EntityIndexResult);
		const entitySchemas = yield select(getEntitySchemas);
		const normalized = normalize(result.data, collectionName, entitySchemas);
		const nowTime = moment().format();
		yield put(receiveEntities(normalized.entities, nowTime));
		yield put(receiveEntityIndex(indexHash, normalized.result, result.existingCount, nowTime));
	} catch (e) {
		apiServiceResultTypeInvariant(e, Error);
		yield put(fetchEntityIndexFailure(indexHash, e));
	}
}

const ensureEntityIndexTasks = {};

function *takeLatestEnsure(saga) {
	while (true) { // eslint-disable-line no-constant-condition
		const action = yield take((testedAction) =>
			testedAction.type === ENSURE_ENTITY_INDEX && testedAction.payload
		);
		const { collectionName, filter } = action.payload;
		const indexHash = hash({ collectionName, filter });
		if (!ensureEntityIndexTasks[indexHash] || !ensureEntityIndexTasks[indexHash].isRunning()) {
			ensureEntityIndexTasks[indexHash] = yield fork(saga, action);
		}
	}
}

export default function *entityIndexesFlow() {
	yield takeLatestEnsure(ensureEntityIndexTask);
}
