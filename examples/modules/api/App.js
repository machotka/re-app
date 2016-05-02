import React from 'react';

import {app, container} from 're-app/decorators';
import {createStore} from 're-app/utils';
import ApiService from 're-app/mocks/ApiService';
import apiModule from 're-app/modules/api';
import {setHost} from 're-app/modules/api/actions';

import Select from 're-app/components/Select';
import Checkbox from 're-app/components/Checkbox';

import LabeledArea from 're-app-examples/LabeledArea';

const store = createStore({
	modules: [
		apiModule
	]
}, {
	api: {
		host: {
			name: 'example.com',
			ssl: true
		},
		service: ApiService
	}
});

@app(store)
@container(
	(state) => ({api: state.api}), // mapStateToProps
	(dispatch) => ({ // mapDispatchToProps
		setHost: (ssl, name) => {
			dispatch(setHost(ssl, name));
		}
	})
)
export default class App extends React.Component {

	setHostname(name) {
		const { setHost, api } = this.props;
		setHost(api.host.ssl, name);
	}

	setSsl(ssl) {
		const { setHost, api } = this.props;
		setHost(ssl, api.host.name);
	}

	render() {
		const { api: {host} } = this.props;
		return (
			<div className="App">
				<div className="well">
					<label>
						<Select options={['example.com', 'example2.com']}
								onChange={this.setHostname.bind(this)}
								value={host.name}
						/>
					</label>
					<label>
						<Checkbox onChange={this.setSsl.bind(this)}
								  checked={host.ssl}/>
						SSL
					</label>
				</div>
				<LabeledArea title="api.host state subtree">
					<pre>{JSON.stringify(host, null, 2)}</pre>
				</LabeledArea>
			</div>
		);
	}
}
