import {get, differenceBy} from 'lodash';
import server from 'server';

export const RENDER_MODAL = 'RENDER_MODAL';
export function renderModal(modal: any, data: any): any {
    return {type: RENDER_MODAL, modal, data};
}

export const CLOSE_MODAL = 'CLOSE_MODAL';
export function closeModal(): any {
    return {type: CLOSE_MODAL};
}

export const SAVED_ITEMS_COUNT = 'SAVED_ITEMS_COUNT';
export function setSavedItemsCount(count: any): any {
    return {type: SAVED_ITEMS_COUNT, count: count};
}

export const SET_UI_CONFIG = 'SET_UI_CONFIG';
export function setUiConfig(config: any): any {
    return {type: SET_UI_CONFIG, config: config};
}

export const MODAL_FORM_VALID = 'MODAL_FORM_VALID';
export function modalFormValid(): any {
    return (dispatch: any, getState: any) => {
        if (!get(getState(), 'modal.formValid')) {
            dispatch({type: MODAL_FORM_VALID});
        }

        return Promise.resolve();
    };
}

export const MODAL_FORM_INVALID = 'MODAL_FORM_INVALID';
export function modalFormInvalid(): any {
    return (dispatch: any, getState: any) => {
        if (get(getState(), 'modal.formValid')) {
            dispatch({type: MODAL_FORM_INVALID});
        }

        return Promise.resolve();
    };
}

export const USER_PROFILE_CLOSED = 'USER_PROFILE_CLOSED';
export function userProfileClosed(): any {
    return {type: USER_PROFILE_CLOSED};
}

export const ADD_EDIT_USERS = 'ADD_EDIT_USERS';
export function getEditUsers(item: any): any {
    return function(dispatch: any, getState: any) {
        let findUsers = [];
        const itemUsers = ([
            item.original_creator,
            item.version_creator
        ].filter((u: any) => u));
        const editUsers = getState().editUsers || [];

        if (!get(item, 'version_creator') && !get(item, 'original_creator')) {
            return Promise.resolve();
        }

        findUsers = differenceBy(editUsers, itemUsers.map((u: any) => ({'_id': u})), '_id');
        if (editUsers.length === 0 || findUsers.length > 0) {
            return server.get(`/users/search?ids=${itemUsers.join(',')}`)
                .then((data: any) => {
                    dispatch({
                        type: ADD_EDIT_USERS,
                        data
                    });
                });
        }

        return Promise.resolve();
    };
}
