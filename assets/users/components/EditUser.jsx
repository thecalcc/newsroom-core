import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import classNames from 'classnames';
import {get} from 'lodash';

import TextInput from 'components/TextInput';
import SelectInput from 'components/SelectInput';
import CheckboxInput from 'components/CheckboxInput';
import AuditInformation from 'components/AuditInformation';

import {gettext} from 'utils';
import {isUserAdmin, getUserTypes, getUserLabel, userTypeReadOnly, getLocaleInputOptions, getDefaultLocale} from '../utils';
import {FormToggle} from 'ui/components/FormToggle';

import {getUserStateLabelDetails} from 'company-admin/components/CompanyUserListItem';
import {isProductEnabled} from 'companies/utils';

import {companyProductSeatsSelector, currentCompanySelector, companySectionListSelector} from 'company-admin/selectors';

const getCompanyOptions = (companies) => companies.map(company => ({value: company._id, text: company.name}));

function EditUserComponent({
    user,
    onChange,
    errors,
    companies,
    onSave,
    onResetPassword,
    onClose,
    onDelete,
    currentUser,
    toolbar,
    products,
    hideFields,
    companySections,
    seats,
    company,
}) {
    const localeOptions = getLocaleInputOptions();
    const stateLabelDetails = getUserStateLabelDetails(user);
    const companyProductIds = Object.keys(seats[company._id]);
    const sections = companySections[company._id];
    const companySectionIds = sections.map((section) => section._id);

    return (
        <div className='list-item__preview' role={gettext('dialog')} aria-label={gettext('Edit User')}>
            <div className='list-item__preview-header'>
                <h3>{ gettext('Add/Edit User') }</h3>
                <button
                    id='hide-sidebar'
                    type='button'
                    className='icon-button'
                    data-bs-dismiss='modal'
                    aria-label={gettext('Close')}
                    onClick={onClose}>
                    <i className="icon--close-thin icon--gray" aria-hidden='true'></i>
                </button>
            </div>
            <AuditInformation item={user} />
            <div className="list-item__preview-content">
                {toolbar ? toolbar : (
                    <div className="list-item__preview-toolbar">
                        <div>
                            <label className={`label label--${stateLabelDetails.colour} label--big label--rounded`}>
                                {stateLabelDetails.text}
                            </label>
                            {user.user_type !== 'administrator' ? null : (
                                <label className="label label--green label--fill label--big label--rounded">
                                    {gettext('admin')}
                                </label>
                            )}
                        </div>
                    </div>
                )}
                <form>
                    <div className="list-item__preview-form pt-0">
                        <FormToggle
                            expanded={true}
                            title={gettext('General')}
                        >
                            {hideFields.includes('first_name') ? null : (<TextInput
                                name='first_name'
                                label={gettext('First Name')}
                                value={user.first_name}
                                onChange={onChange}
                                error={errors ? errors.first_name : null} />)}

                            {hideFields.includes('last_name') ? null : (<TextInput
                                name='last_name'
                                label={gettext('Last Name')}
                                value={user.last_name}
                                onChange={onChange}
                                error={errors ? errors.last_name : null} />)}

                            {hideFields.includes('email') ? null : (<TextInput
                                name='email'
                                label={gettext('Email')}
                                value={user.email}
                                onChange={onChange}
                                error={errors ? errors.email : null} />)}

                            {hideFields.includes('phone') ? null : (<TextInput
                                name='phone'
                                label={gettext('Phone')}
                                value={user.phone}
                                onChange={onChange}
                                error={errors ? errors.phone : null} />)}

                            {hideFields.includes('mobile') ? null : (<TextInput
                                name='mobile'
                                label={gettext('Mobile')}
                                value={user.mobile}
                                onChange={onChange}
                                error={errors ? errors.mobile : null} />)}

                            {hideFields.includes('role') ? null : (<TextInput
                                name='role'
                                label={gettext('Role')}
                                value={user.role}
                                onChange={onChange}
                                error={errors ? errors.role : null} />)}
                            {hideFields.includes('user_type') ? null : (<SelectInput
                                name='user_type'
                                label={gettext('User Type')}
                                value={user.user_type}
                                options={userTypeReadOnly(user, currentUser) ? [] : getUserTypes(currentUser) }
                                defaultOption={userTypeReadOnly(user, currentUser) ? getUserLabel(user.user_type) : null}
                                readOnly={userTypeReadOnly(user, currentUser)}
                                onChange={onChange}
                                error={errors ? errors.user_type : null}/>)}
                            {hideFields.includes('company') ? null : (<SelectInput
                                name='company'
                                label={gettext('Company')}
                                value={user.company}
                                defaultOption={''}
                                options={getCompanyOptions(companies)}
                                onChange={onChange}
                                error={errors ? errors.company : null} />)}

                            {(!localeOptions.length || hideFields.includes('language')) ? null : (
                                <SelectInput
                                    name={'locale'}
                                    label={gettext('Language')}
                                    value={user.locale}
                                    onChange={onChange}
                                    options={localeOptions}
                                    defaultOption={getDefaultLocale()}
                                    error={errors ? errors.locale : null}
                                />
                            )}
                        </FormToggle>

                        {hideFields.includes('sections') ? null : (<FormToggle title={gettext('Sections')}>
                            {sections.filter((section) => companySectionIds.includes(section._id)).map((section) => (
                                <div className="list-item__preview-row" key={section._id}>
                                    <div className="form-group">
                                        <CheckboxInput
                                            name={`sections.${section._id}`}
                                            label={section.name}
                                            value={get(user, `sections.${section._id}`) || false}
                                            onChange={onChange}
                                        />
                                    </div>
                                </div>
                            ))}
                        </FormToggle>)}

                        {hideFields.includes('products') ? null : (<FormToggle title={gettext('Products')}>
                            {sections.filter((section) => companySectionIds.includes(section._id)).map((section) => (
                                <React.Fragment key={section._id}>
                                    <div className="list-item__preview-subheading">
                                        {section.name}
                                    </div>
                                    {products.filter(
                                        (product) => product.product_type === section._id &&
                                            companyProductIds.includes(product._id)
                                    ).map((product) => (
                                        <div className="list-item__preview-row" key={product._id}>
                                            <div className="form-group">
                                                <CheckboxInput
                                                    name={`products.${section._id}.${product._id}`}
                                                    label={product.name}
                                                    value={isProductEnabled(user.products || [], product._id)}
                                                    onChange={onChange}
                                                    readOnly={seats[company._id][product._id].max_reached === true}
                                                />
                                            </div>
                                            <div className={classNames({'text-danger': seats[company._id][product._id].max_reached === true})}>
                                                {seats[company._id][product._id].assigned_seats}/{seats[company._id][product._id].max_seats}
                                            </div>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </FormToggle>)}

                        <FormToggle title={gettext('User Settings')}>
                            {hideFields.includes('is_approved') ? null : (<div className="list-item__preview-row">
                                <div className="form-group">
                                    <CheckboxInput
                                        name='is_approved'
                                        label={gettext('Approved')}
                                        value={user.is_approved}
                                        onChange={onChange} />
                                </div>
                            </div>)}

                            {hideFields.includes('is_enabled') ? null : (<div className="list-item__preview-row">
                                <div className="form-group">
                                    <CheckboxInput
                                        name='is_enabled'
                                        label={gettext('Enabled')}
                                        value={user.is_enabled}
                                        onChange={onChange} />
                                </div>
                            </div>)}

                            {hideFields.includes('expiry_alert') ? null : (<div className="list-item__preview-row">
                                <div className="form-group">
                                    <CheckboxInput
                                        name='expiry_alert'
                                        label={gettext('Company Expiry Alert')}
                                        value={user.expiry_alert}
                                        onChange={onChange} />
                                </div>
                            </div>)}

                            {hideFields.includes('manage_company_topics') ? null : (<div className="list-item__preview-row">
                                <div className="form-group">
                                    <CheckboxInput
                                        name='manage_company_topics'
                                        label={gettext('Manage Company Topics')}
                                        value={user.manage_company_topics}
                                        onChange={onChange} />
                                </div>
                            </div>)}
                        </FormToggle>

                    </div>

                    <div className='list-item__preview-footer'>
                        {user._id ?
                            <input
                                type='button'
                                className='btn btn-outline-secondary'
                                value={gettext('Reset Password')}
                                id='resetPassword'
                                onClick={onResetPassword} /> : null}

                        <input
                            type='button'
                            className='btn btn-outline-primary'
                            value={gettext('Save')}
                            onClick={onSave} />

                        {user._id && isUserAdmin(currentUser) && (user._id !== currentUser._id) && <input
                            type='button'
                            className='btn btn-outline-primary'
                            value={gettext('Delete')}
                            onClick={onDelete} />}
                    </div>
                </form>
            </div>
        </div>
    );
}

EditUserComponent.propTypes = {
    user: PropTypes.object.isRequired,
    onChange: PropTypes.func,
    errors: PropTypes.object,
    companies: PropTypes.arrayOf(PropTypes.object),
    onSave: PropTypes.func.isRequired,
    onResetPassword: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    currentUser: PropTypes.object,
    toolbar: PropTypes.node,
    products: PropTypes.arrayOf(PropTypes.object),
    hideFields: PropTypes.arrayOf(PropTypes.string),

    companySections: PropTypes.object,
    seats: PropTypes.object,
    company: PropTypes.object,
};

EditUserComponent.defaultProps = {
    hideFields: [],
};

const mapStateToProps = (state) => ({
    companySections: companySectionListSelector(state),
    seats: companyProductSeatsSelector(state),
    company: currentCompanySelector(state),
});

const EditUser = connect(mapStateToProps)(EditUserComponent);

export default EditUser;
