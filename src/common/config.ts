/* eslint-disable camelcase */
import { Environment } from './environment';

export const oidcConfig = {
	authority: 'https://auth.topfilms.io/realms/dev',
	client_id: 'topfilms-admin',
	redirect_uri: Environment.frontendUrl()
};