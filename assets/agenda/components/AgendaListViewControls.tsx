import React from 'react';
import PropTypes from 'prop-types';

import AgendaFeaturedStoriesToggle from './AgendaFeaturedStoriesToogle.jsx';
import ListViewOptions from 'assets/components/ListViewOptions.js';
import {DISPLAY_AGENDA_FEATURED_STORIES_ONLY} from 'assets/utils.js';

function AgendaListViewControls({activeView, setView, hideFeaturedToggle, toggleFeaturedFilter, featuredFilter, hasAgendaFeaturedItems}: any) {
    return(
        <div className='content-bar__right'>
            {!hideFeaturedToggle && hasAgendaFeaturedItems  && DISPLAY_AGENDA_FEATURED_STORIES_ONLY &&
                <AgendaFeaturedStoriesToggle onChange={toggleFeaturedFilter} featuredFilter={featuredFilter}/>
            }
            <ListViewOptions setView={setView} activeView={activeView} />
        </div>
    );
}


AgendaListViewControls.propTypes = {
    activeView: PropTypes.string,
    setView: PropTypes.func.isRequired,
    toggleFeaturedFilter: PropTypes.func.isRequired,
    hideFeaturedToggle: PropTypes.bool,
    featuredFilter: PropTypes.bool,
    hasAgendaFeaturedItems: PropTypes.bool,
};

export default AgendaListViewControls;
