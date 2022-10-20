/**
 * External dependencies
 */
import type { ForwardedRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { RadioGroup, useRadioState } from 'reakit';

/**
 * WordPress dependencies
 */
import {
	useMergeRefs,
	useInstanceId,
	usePrevious,
	useResizeObserver,
} from '@wordpress/compose';
import { forwardRef, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { View } from '../../view';
import ToggleGroupControlBackdrop from './toggle-group-control-backdrop';
import ToggleGroupControlContext from '../context';
import { useUpdateEffect } from '../../utils/hooks';
import type { WordPressComponentProps } from '../../ui/context';
import type { ToggleGroupControlAsRadioProps } from '../types';

function UnforwardedToggleGroupControlAsRadio(
	{
		children,
		isAdaptiveWidth,
		label,
		onChange,
		size,
		value,
		...otherProps
	}: WordPressComponentProps< ToggleGroupControlAsRadioProps, 'div', false >,
	forwardedRef: ForwardedRef< any >
) {
	const containerRef = useRef();
	const [ resizeListener, sizes ] = useResizeObserver();
	const baseId = useInstanceId(
		ToggleGroupControlAsRadio,
		'toggle-group-control-as-radio'
	).toString();
	const radio = useRadioState( {
		baseId,
		state: value,
	} );
	const previousValue = usePrevious( value );

	// Propagate radio.state change.
	useUpdateEffect( () => {
		// Avoid calling onChange if radio state changed
		// from incoming value.
		if ( previousValue !== radio.state ) {
			onChange( radio.state );
		}
	}, [ radio.state ] );

	// Sync incoming value with radio.state.
	useUpdateEffect( () => {
		if ( value !== radio.state ) {
			radio.setState( value );
		}
	}, [ value ] );

	return (
		<ToggleGroupControlContext.Provider
			value={ { ...radio, isBlock: ! isAdaptiveWidth, size } }
		>
			<RadioGroup
				{ ...radio }
				aria-label={ label }
				as={ View }
				{ ...otherProps }
				ref={ useMergeRefs( [ containerRef, forwardedRef ] ) }
			>
				{ resizeListener }
				<ToggleGroupControlBackdrop
					{ ...radio }
					containerRef={ containerRef }
					containerWidth={ sizes.width }
					isAdaptiveWidth={ isAdaptiveWidth }
				/>
				{ children }
			</RadioGroup>
		</ToggleGroupControlContext.Provider>
	);
}

export const ToggleGroupControlAsRadio = forwardRef(
	UnforwardedToggleGroupControlAsRadio
);
