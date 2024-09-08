import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../../components/loader/Loader';
import classes from './root.module.css';
import { Header } from '../../components/header/Header';

/**
 * Root element for the UI. Wraps child component with the header and footer
 */
export default function Root() {
	const { pathname } = useLocation();
	const auth = useAuth();

	useEffect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			auth.signinRedirect();
		}
	}, [auth]);

	if (auth.isLoading || !auth.isAuthenticated) {
		return <Loader isLoading={true}></Loader>;
	}
	
	return (
		<>
			{/* Home/Landing page at /home -- no root path */}
			{pathname === '/' 
				? <Navigate to='/home' replace />
				: <div className={classes.container}>
					<header><Header /></header>
					<main><Outlet /></main>
				</div>
			}
		</>
	);
}