import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {gettext, isDisplayed, isMobilePhone} from 'utils';
import {get} from 'lodash';
import {
    getCardDashboardComponent,
} from 'components/cards/utils';


import getItemActions from 'wire/item-actions';
import ItemDetails from 'wire/components/ItemDetails';
import {openItemDetails, setActive, fetchCardExternalItems, fetchCompanyCardItems} from '../actions';
import ShareItemModal from 'components/ShareItemModal';
import DownloadItemsModal from 'wire/components/DownloadItemsModal';
import WirePreview from 'wire/components/WirePreview';
import {followStory} from 'search/actions';
import {downloadMedia} from 'wire/actions';
import {SearchBar} from './search-bar';
import {previewConfigSelector, listConfigSelector, detailsConfigSelector, isSearchEnabled} from 'ui/selectors';
import {filterGroupsToLabelMap} from 'search/selectors';
import CardRow from 'components/cards/render/CardRow';

const modals = {
    shareItem: ShareItemModal,
    downloadItems: DownloadItemsModal,
};

class HomeApp extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getPanels = this.getPanels.bind(this);
        this.filterActions = this.filterActions.bind(this);
        this.renderModal = this.renderModal.bind(this);
        this.onHomeScroll = this.onHomeScroll.bind(this);
        this.height = 0;

        this.state = {loadingItems: true};
    }

    componentDidMount() {
        document.getElementById('footer').className = 'footer footer--home';
        this.height = this.elem.offsetHeight;

        // Load items for cards
        Promise.all([
            this.props.fetchCompanyCardItems(),
            ...this.props.cards
                .filter((card) => card.dashboard === 'newsroom' && card.type === '4-photo-gallery')
                .map((card) => (
                    this.props.fetchCardExternalItems(get(card, '_id'), get(card, 'label'))
                )),
        ])
            .then(() => {
                this.setState({loadingItems: false});
            });
    }

    renderModal(specs) {
        if (specs) {
            const Modal = modals[specs.modal];
            return (
                <Modal key="modal" data={specs.data} />
            );
        }
    }

    onHomeScroll(event) {
        const container = event.target;
        const BUFFER = 100;
        if(container.scrollTop + this.height + BUFFER >= container.scrollHeight) {
            document.getElementById('footer').className = 'footer';
        } else {
            document.getElementById('footer').className = 'footer footer--home';
        }
    }

    getProduct(card) {
        return this.props.products.find(p => p._id === card.config.product);
    }

    getPanels(card) {
        if (this.state.loadingItems) {
            return (
                <CardRow key={card.label} title={card.label} product={this.getProduct(card)} isActive={this.props.activeCard === card._id}>
                    <div className='col-sm-6 col-md-4 col-lg-3 col-xxl-2 d-flex mb-4'>
                        <div className="spinner-border text-success" />
                        <span className="a11y-only">{gettext('Loading Card Items')}</span>
                    </div>
                </CardRow>
            );
        }

        const Panel = getCardDashboardComponent(card.type);
        const items = this.props.itemsByCard[card.label] || [];

        if (card.type === '4-photo-gallery') {
            return <Panel
                key={card.label}
                photos={items}
                title={card.label}
                moreUrl={card.config.more_url}
                moreUrlLabel={card.config.more_url_label}
                listConfig={this.props.listConfig}
            />;
        }
        if (card.type === '2x2-events') {
            return <Panel
                key={card.label}
                events={get(card, 'config.events')}
                title={card.label}
                listConfig={this.props.listConfig}
            />;
        }

        return <Panel
            key={card.label}
            type={card.type}
            items={items}
            title={card.label}
            product={this.getProduct(card)}
            openItem={this.props.openItemDetails}
            isActive={this.props.activeCard === card._id}
            cardId={card._id}
            listConfig={this.props.listConfig}
        />;
    }

    filterActions(item, config) {
        return this.props.actions.filter((action) =>  (!config || isDisplayed(action.id, config)) &&
          (!action.when || action.when(this.props, item)));
    }

    renderContent(children) {
        return (
            <React.Fragment>
                {this.props.isSearchEnabled && (
                    <SearchBar />
                )}

                <section className="content-main d-block py-4 px-2 p-md-3 p-lg-4"
                    onScroll={this.onHomeScroll}
                    ref={(elem) => this.elem = elem}
                >
                    <div className="container-fluid">
                        {this.props.cards.length > 0 &&
                        this.props.cards.filter((c) => c.dashboard === 'newsroom').map((card) => this.getPanels(card))}
                        {this.props.cards.length === 0 &&
                        <div className="alert alert-warning" role="alert">
                            <strong>{gettext('Warning')}!</strong> {gettext('There\'s no card defined for home page!')}
                        </div>
                        }
                    </div>
                    {children}
                </section>
            </React.Fragment>
        );
    }

    renderNonMobile() {
        const modal = this.renderModal(this.props.modal);

        return (
            (this.props.itemToOpen ? [<ItemDetails key="itemDetails"
                item={this.props.itemToOpen}
                user={this.props.user}
                topics={this.props.topics}
                actions={this.filterActions(this.props.itemToOpen, this.props.previewConfig)}
                onClose={() => this.props.actions.filter(a => a.id === 'open')[0].action(null)}
                followStory={this.props.followStory}
                detailsConfig={this.props.detailsConfig}
                filterGroupLabels={this.props.filterGroupLabels}
                downloadMedia={this.props.downloadMedia}
            />, modal] :
                this.renderContent()
            )
        );
    }

    renderMobile() {
        const modal = this.renderModal(this.props.modal);
        const isFollowing = get(this.props, 'itemToOpen.slugline') && this.props.topics &&
            this.props.topics.find((topic) => topic.query === `slugline:"${this.props.itemToOpen.slugline}"`);

        return this.renderContent([
            <div key='preview_test' className={`wire-column__preview ${this.props.itemToOpen ? 'wire-column__preview--open' : ''}`}>
                {this.props.itemToOpen && (
                    <WirePreview
                        item={this.props.itemToOpen}
                        user={this.props.user}
                        actions={this.filterActions(this.props.itemToOpen, this.props.previewConfig)}
                        followStory={this.props.followStory}
                        isFollowing={!!isFollowing}
                        closePreview={() => this.props.actions.filter(a => a.id === 'open')[0].action(null)}
                        previewConfig={this.props.previewConfig}
                        downloadMedia={this.props.downloadMedia}
                        listConfig={this.props.listConfig}
                        filterGroupLabels={this.props.filterGroupLabels}
                    />
                )}
            </div>,
            modal
        ]);
    }

    render() {
        return isMobilePhone() ?
            this.renderMobile() :
            this.renderNonMobile();
    }
}

HomeApp.propTypes = {
    cards: PropTypes.arrayOf(PropTypes.object),
    itemsByCard: PropTypes.object,
    products: PropTypes.array,
    user: PropTypes.string,
    userType: PropTypes.string,
    company: PropTypes.string,
    format: PropTypes.array,
    itemToOpen: PropTypes.object,
    modal: PropTypes.object,
    openItemDetails: PropTypes.func,
    activeCard: PropTypes.string,
    actions: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string,
        action: PropTypes.func,
    })),
    fetchCardExternalItems: PropTypes.func,
    fetchCompanyCardItems: PropTypes.func,
    followStory: PropTypes.func,
    previewConfig: PropTypes.object,
    listConfig: PropTypes.object,
    detailsConfig: PropTypes.object,
    downloadMedia: PropTypes.func,
    topics: PropTypes.array,
    isFollowing: PropTypes.bool,
    isSearchEnabled: PropTypes.bool,
    filterGroupLabels: PropTypes.object,
};

const mapStateToProps = (state) => ({
    cards: state.cards,
    itemsByCard: state.itemsByCard,
    products: state.products,
    user: state.user,
    userType: state.userType,
    company: state.company,
    format: PropTypes.format,
    itemToOpen: state.itemToOpen,
    modal: state.modal,
    activeCard: state.activeCard,
    previewConfig: previewConfigSelector(state),
    listConfig: listConfigSelector(state),
    detailsConfig: detailsConfigSelector(state),
    topics: state.topics || [],
    isSearchEnabled: isSearchEnabled(state),
    filterGroupLabels: filterGroupsToLabelMap(state),
});

const mapDispatchToProps = (dispatch) => ({
    openItemDetails: (item, cardId) => {
        dispatch(openItemDetails(item));
        dispatch(setActive(cardId));
    },
    actions: getItemActions(dispatch),
    fetchCardExternalItems: (cardId, cardLabel) => dispatch(fetchCardExternalItems(cardId, cardLabel)),
    fetchCompanyCardItems: () => dispatch(fetchCompanyCardItems()),
    followStory: (item) => followStory(item, 'wire'),
    downloadMedia: (href, id, mimeType) => dispatch(downloadMedia(href, id, mimeType)),
});


export default connect(mapStateToProps, mapDispatchToProps)(HomeApp);
