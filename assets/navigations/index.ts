import {createStore} from 'utils';
import {render} from 'render-utls';
import navigationReducer from './reducers';
import NavigationsApp from './components/NavigationsApp';
import {initViewData} from './actions';


const store = createStore(navigationReducer, 'Navigations');


if (window.viewData) {
    store.dispatch(initViewData(window.viewData));
}


render(store, NavigationsApp, document.getElementById('settings-app'));
