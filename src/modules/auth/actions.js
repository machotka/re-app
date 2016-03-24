export const INIT 			= 're-app/auth/INIT';
export const LOGIN 			= 're-app/auth/LOGIN';
export const LOGIN_SUCCESS 	= 're-app/auth/LOGIN_SUCCESS';
export const LOGIN_FAILURE 	= 're-app/auth/LOGIN_FAILURE';
export const LOGOUT 		= 're-app/auth/LOGOUT';
export const LOGOUT_SUCCESS = 're-app/auth/LOGOUT_SUCCESS';
export const LOGOUT_FAILURE = 're-app/auth/LOGOUT_FAILURE';

export function init() {
	return {type: INIT};
}

export function login(credentials) {
	return {type: LOGIN, payload: credentials};
}

export function loginSuccess(user) {
	return {type: LOGIN_SUCCESS, payload: user};
}

export function loginFailure() {
	return {type: LOGIN_FAILURE};
}

export function logout() {
	return {type: LOGOUT};
}

export function logoutSuccess() {
	return {type: LOGOUT_SUCCESS};
}

export function logoutFailure() {
	return {type: LOGOUT_FAILURE};
}
