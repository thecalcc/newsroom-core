
import {
    INIT_DATA,
    OPEN_ITEM,
    SET_ACTIVE,
    SET_CARD_ITEMS,
    SET_MULTIPLE_CARD_ITEMS,
} from './actions';
import {BOOKMARK_ITEMS, REMOVE_BOOKMARK} from '../wire/actions';
import {CLOSE_MODAL, MODAL_FORM_VALID, RENDER_MODAL, SET_USER} from '../actions';
import {modalReducer} from '../reducers';
import {topicsReducer} from '../topics/reducer';

const initialState: any = {
    cards: [],
    topics: [],
    products: [],
    itemsByCard: {},
    activeCard: null,
    uiConfig: {},
    userProducts: [],
    currentUser: {},
};

export default function homeReducer(state: any = initialState, action: any) {

    switch (action.type) {

    case INIT_DATA:
        return {
            ...state,
            cards: action.data.cards,
            itemsByCard: {},
            currentUser: action.data.currentUser,
            products: action.data.products,
            user: action.data.user,
            userType: action.data.userType,
            userProducts: action.data.userProducts,
            company: action.data.company,
            formats: action.data.formats || [],
            userSections: action.data.userSections,
            uiConfig: action.data.ui_config || {},
            topics: action.data.topics || [],
            context: 'wire',
            groups: action.data.groups || [],
        };

    case OPEN_ITEM:{
        return {
            ...state,
            itemToOpen: action.item || null,
        };
    }

    case SET_USER: {
        return {
            ...state,
            currentUser: action.data
        };
    }

    case SET_ACTIVE:
        return {
            ...state,
            activeCard: action.cardId || null,
        };

    case BOOKMARK_ITEMS: {
        const itemToOpen = Object.assign({}, state.itemToOpen);
        itemToOpen.bookmarks = (itemToOpen.bookmarks || []).concat([state.user]);

        return {
            ...state,
            itemToOpen,
        };
    }

    case REMOVE_BOOKMARK: {
        const itemToOpen = Object.assign({}, state.itemToOpen);
        itemToOpen.bookmarks = (itemToOpen.bookmarks || []).filter((val: any) => val !== state.user);

        return {
            ...state,
            itemToOpen,
        };
    }

    case SET_CARD_ITEMS: {
        return {
            ...state,
            itemsByCard: {
                ...state.itemsByCard,
                [action.payload.card]: action.payload.items,
            },
        };
    }

    case SET_MULTIPLE_CARD_ITEMS: {
        return {
            ...state,
            itemsByCard: {
                ...state.itemsByCard,
                ...action.payload,
            },
        };
    }

    case RENDER_MODAL:
    case MODAL_FORM_VALID:
    case CLOSE_MODAL:
        return {...state, modal: modalReducer(state.modal, action)};

    default:
        return {...state, topics: topicsReducer(state.topics, action)};
    }
}
