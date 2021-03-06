import React, { PropTypes as T } from 'react';
import _ from 'lodash';
import './Example.less';
import { container } from 're-app/lib/decorators';
import CodeArea from 're-app-examples/CodeArea';
import Markdown from 're-app-examples/Markdown';
import classnames from 'classnames';

@container(
	(state) => ({ repository: state.repository })
)
export default class Example extends React.Component {

	static propTypes = {
		children: T.node,
		readme: T.string,
		sourcePath: T.string,
		repository: T.object,
		codeFiles: T.arrayOf(T.shape({
			name: T.string.isRequired,
			content: T.string.isRequired,
			description: T.string,
		})),
	};

	static defaultProps = {
		codeFiles: [],
	};

	constructor(props) {
		super(props);
		this.switchCodeFileTab = this.switchCodeFileTab.bind(this);
		const { codeFiles } = props;
		this.state = {
			activeCodeFileName: codeFiles.length ? _.first(codeFiles).name : null,
		};
	}

	getSourceTreeLink() {
		const { repository: { rootUrl }, sourcePath } = this.props;
		if (sourcePath) {
			const url = `${rootUrl}src/${sourcePath}`;
			return (
				<span className="Example-codeLink">
					&nbsp;
					<small>
						<a href={url} target="_blank">
							See source of <code>{sourcePath}</code> on GitHub
						</a>
					</small>
				</span>
			);
		}
		return null;
	}

	switchCodeFileTab(codeFileName) {
		this.setState({ activeCodeFileName: codeFileName });
	}

	render() {
		const { readme, children, codeFiles } = this.props;
		const { activeCodeFileName } = this.state;
		return (
			<div className="Example">
				<div className="row">
					<div className="col-xs-12 col-lg-6">
						<h1>Example</h1>
						{readme && <div className="Example-readme">
							<Markdown content={readme} />
						</div>}
						<div className="Example-content">
							<div className="panel panel-default">
								<div className="panel-body">
									{children}
								</div>
							</div>
						</div>
					</div>
					{codeFiles.length > 0 && (
						<div className="col-xs-12 col-lg-6">
							<div className="clearfix">
								<h1>
									Code
									{this.getSourceTreeLink()}
								</h1>
							</div>
							<ul className="nav nav-tabs">
								{codeFiles.map((codeFile, index) => (
									<li
										key={codeFile.name}
										role="presentation"
										className={classnames({ active: codeFile.name === activeCodeFileName })}
									>
										<a onClick={(() => { this.switchCodeFileTab(codeFile.name); })}>
											<code>{codeFile.name}</code>
											{index === 0 ?
												<span>&nbsp;<span className="badge">entry point</span></span> : null}
										</a>
									</li>
								))}
							</ul>
							<div className="tab-content">
								{
									codeFiles
										.filter((codeFile) => codeFile.name === activeCodeFileName)
										.map((codeFile) => (
											<div key={codeFile.description} className="tab-pane">
												<CodeArea className="Example-code" title={codeFile.description}>
													{codeFile.content}
												</CodeArea>
											</div>
										))
								}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}
}
