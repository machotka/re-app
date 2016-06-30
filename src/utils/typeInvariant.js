import invariant from 'invariant';
import t from 'tcomb';
import { validate } from 'tcomb-validation';

export default function typeInvariant(value, type, message, ...messageParams) {
	invariant(type && t.isType(type), '"type" passed into typeInvariant must be tcomb type');
	const validationResult = validate(value, type);
	const firstError = validationResult.firstError();
	const tcombMessage = firstError && firstError.message;
	invariant(
		validationResult.isValid(),
		`Type validation failed:\n\n${tcombMessage}\n\n${message ? `INFO: ${message}` : ''}`,
		...messageParams
	);
}
