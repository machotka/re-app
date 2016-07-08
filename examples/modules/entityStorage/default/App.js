import React, { PropTypes as T } from 'react';

import _ from 'lodash';

import LabeledArea from 're-app-examples/LabeledArea';
import LabeledJsonInspector from 're-app-examples/LabeledJsonInspector';
import DevTools from 're-app-examples/DevTools';

import { createStore } from 're-app/lib/utils';
import { app, container } from 're-app/lib/decorators';
import apiModule from 're-app/lib/modules/api';
import entityDescriptorsModule from 're-app/lib/modules/entityDescriptors';
import entityStorageModule from 're-app/lib/modules/entityStorage';
import ApiService from 're-app/lib/mocks/ApiService';
import {
	ensureEntityCollection,
	ensureEntity,
	mergeEntity,
	deleteEntity,
} from 're-app/lib/modules/entityStorage/actions';
import {
	getDenormalizedEntitiesGetter,
} from 're-app/lib/modules/entityStorage/selectors';

import hash from 'object-hash';
import moment from 'moment';

const store = createStore(
	{
		modules: [
			apiModule,
			entityDescriptorsModule,
			entityStorageModule,
		],
		enhancers: [
			DevTools.instrument(),
		],
	},
	{
		api: {
			service: ApiService,
		},
	}
);

@app(
	store,
	(state) => state.entityDescriptors.initialized, // show splashscreen until schemas are loaded
	(() => <div>loading schemas</div>)() // splashscreen element
)
@container(
	(state) => ({
		state,
		postsSchema: state.entityDescriptors.schemas.posts,
		postsStatuses: _.get(state.entityStorage.statuses, ['posts'], {}),
		posts: getDenormalizedEntitiesGetter(
			'posts',
			_.get(state.entityStorage.collections, 'posts', []),
			1
		)(state),
	}),
	(dispatch) => ({
		loadPosts: (e) => {
			e.preventDefault();
			dispatch(ensureEntityCollection('posts'));
		},
		loadPost: (postId, e) => {
			e.preventDefault();
			dispatch(ensureEntity('posts', postId));
		},
		createPost: (postsSchema, postData, e) => {
			e.preventDefault();
			const postHash = hash({ postData, time: moment().format(), random: Math.random() });
			dispatch(
				mergeEntity(
					'posts',
					_.assign({}, postData, { [postsSchema.idFieldName]: postHash })
				)
			);
		},
		updatePost: (postData, e) => {
			e.preventDefault();
			dispatch(mergeEntity('posts', postData));
		},
		deletePost: (postId, e) => {
			e.preventDefault();
			dispatch(deleteEntity('posts', postId));
		},
	})
)
export default class App extends React.Component {

	static propTypes = {
		state: T.object,
		postsStatuses: T.object,
		posts: T.object,
		postsSchema: T.object,
		loadPosts: T.func,
		loadPost: T.func,
		createPost: T.func,
		updatePost: T.func,
		deletePost: T.func,
	}

	constructor(props) {
		super(props);
		this.setPostTitle = this.setPostTitle.bind(this);
		this.setPostId = this.setPostId.bind(this);
		this.state = {
			postData: {
				id: '10431B3C-E66B-5569-AB04-BE7AE27D77ED',
				title: 'New post title',
				// tags: [
				//	{
				//		name: 'tag-1'
				//	},
				//	{
				//		name: 'tag-2'
				//	},
				// ],
			},
		};
	}

	setPostTitle(e) {
		this.setState({ postData: { ...this.state.postData, title: e.target.value } });
	}

	setPostId(e) {
		this.setState({ postData: { ...this.state.postData, id: e.target.value } });
	}

	render() {
		const {
			state,
			postsSchema,
			posts,
			postsStatuses,
			loadPosts,
			loadPost,
			createPost,
			updatePost,
			deletePost,
			} = this.props;

		return (
			<div className="row">
				<div className="col-xs-12">
					{postsSchema ?
						<div className="well">
							<h1>Actions</h1>
							<div className="row">
								<div className="col-xs-12">
									<div className="form-horizontal">
										<div className="form-group">
											<label
												htmlFor="entity-id"
												className="col-sm-2 control-label"
											>
												entityId
											</label>
											<div className="col-sm-10">
												<input
													id="entity-id"
													type="text"
													className="form-control"
													value={this.state.postData.id}
													onChange={this.setPostId}
												/>
											</div>
										</div>
										<div className="form-group">
											<label
												htmlFor="inputPassword3"
												className="col-sm-2 control-label"
											>
												Password
											</label>
											<div className="col-sm-10">
												<input
													type="text"
													className="form-control"
													value={this.state.postData.title}
													onChange={this.setPostTitle}
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
							<ul className="nav nav-pills">
								<li>
									<button
										className="btn btn-primary"
										onClick={loadPosts}
									>
										Load all existing posts
									</button>
								</li>
								<li>
									<button
										className="btn btn-primary"
										onClick={(e) => { loadPost(this.state.postData.id, e); }}
									>
										Load post
									</button>
								</li>
								<li>
									<button
										className="btn btn-success"
										onClick={(e) => { createPost(postsSchema, this.state.postData, e); }}
									>
										Create post
									</button>
								</li>
								<li>
									<button
										className="btn btn-warning"
										onClick={(e) => { updatePost(this.state.postData, e); }}
									>
										Update post
									</button>
								</li>
								<li>
									<button
										className="btn btn-danger"
										onClick={(e) => { deletePost(this.state.postData.id, e); }}
									>
										Delete post
									</button>
								</li>
							</ul>
							<h1>Posts</h1>
							<ul className="list-group">
								{Object.keys(posts).length ?
									_.map(_.values(posts), (post) => {
										const transient = _.get(postsStatuses, [post.id, 'transient'], false);
										return (
											<li
												className="list-group-item"
												key={post.id}
												style={{ opacity: transient ? 0.5 : 1 }}
											>
												{post.id} - {post.title}&nbsp;
												[tags: {Object.values(post.tags || []).map((tag) => tag).join(', ')}]
												<a
													href="#"
													onClick={(e) => { deletePost(post[postsSchema.idFieldName], e); }}
													className="btn btn-xs btn-danger"
												>
													&times;
												</a>
											</li>
										);
									}) :
									<li className="list-group-item">no posts loaded</li>
								}
							</ul>
						</div> :
						<div className="well">
							<i className="fa fa-cog fa-spin" /> Loading entity descriptors...
						</div>
					}

				</div>
				<div className="col-xs-6">
					<LabeledJsonInspector title="Complete app state" data={state} />
				</div>
				<div className="col-xs-6">
					<LabeledArea title="Redux action log">
						<DevTools />
					</LabeledArea>
				</div>
			</div>
		);
	}
}
