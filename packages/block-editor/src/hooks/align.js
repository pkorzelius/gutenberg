/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Popover } from '@wordpress/components';
import { createHigherOrderComponent, useRefEffect } from '@wordpress/compose';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import {
	getBlockSupport,
	getBlockType,
	hasBlockSupport,
} from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { BlockControls, BlockAlignmentControl } from '../components';
import BlockPopover from '../components/block-popover';
import useAvailableAlignments from '../components/block-alignment-control/use-available-alignments';
import { store as blockEditorStore } from '../store';
import { useLayout } from '../components//block-list/layout';

/**
 * An array which includes all possible valid alignments,
 * used to validate if an alignment is valid or not.
 *
 * @constant
 * @type {string[]}
 */
const ALL_ALIGNMENTS = [ 'left', 'center', 'right', 'wide', 'full' ];

/**
 * An array which includes all wide alignments.
 * In order for this alignments to be valid they need to be supported by the block,
 * and by the theme.
 *
 * @constant
 * @type {string[]}
 */
const WIDE_ALIGNMENTS = [ 'wide', 'full' ];

/**
 * Returns the valid alignments.
 * Takes into consideration the aligns supported by a block, if the block supports wide controls or not and if theme supports wide controls or not.
 * Exported just for testing purposes, not exported outside the module.
 *
 * @param {?boolean|string[]} blockAlign          Aligns supported by the block.
 * @param {?boolean}          hasWideBlockSupport True if block supports wide alignments. And False otherwise.
 * @param {?boolean}          hasWideEnabled      True if theme supports wide alignments. And False otherwise.
 *
 * @return {string[]} Valid alignments.
 */
export function getValidAlignments(
	blockAlign,
	hasWideBlockSupport = true,
	hasWideEnabled = true
) {
	let validAlignments;
	if ( Array.isArray( blockAlign ) ) {
		validAlignments = ALL_ALIGNMENTS.filter( ( value ) =>
			blockAlign.includes( value )
		);
	} else if ( blockAlign === true ) {
		// `true` includes all alignments...
		validAlignments = [ ...ALL_ALIGNMENTS ];
	} else {
		validAlignments = [];
	}

	if (
		! hasWideEnabled ||
		( blockAlign === true && ! hasWideBlockSupport )
	) {
		return validAlignments.filter(
			( alignment ) => ! WIDE_ALIGNMENTS.includes( alignment )
		);
	}

	return validAlignments;
}

/**
 * Filters registered block settings, extending attributes to include `align`.
 *
 * @param {Object} settings Original block settings.
 *
 * @return {Object} Filtered block settings.
 */
export function addAttribute( settings ) {
	// Allow blocks to specify their own attribute definition with default values if needed.
	if ( 'type' in ( settings.attributes?.align ?? {} ) ) {
		return settings;
	}
	if ( hasBlockSupport( settings, 'align' ) ) {
		// Gracefully handle if settings.attributes is undefined.
		settings.attributes = {
			...settings.attributes,
			align: {
				type: 'string',
				// Allow for '' since it is used by updateAlignment function
				// in withToolbarControls for special cases with defined default values.
				enum: [ ...ALL_ALIGNMENTS, '' ],
			},
		};
	}

	return settings;
}

/**
 * Override the default edit UI to include new toolbar controls for block
 * alignment, if block defines support.
 *
 * @param {Function} BlockEdit Original component.
 *
 * @return {Function} Wrapped component.
 */
export const withToolbarControls = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const blockEdit = <BlockEdit { ...props } />;
		const { name: blockName } = props;
		// Compute the block valid alignments by taking into account,
		// if the theme supports wide alignments or not and the layout's
		// availble alignments. We do that for conditionally rendering
		// Slot.
		const blockAllowedAlignments = getValidAlignments(
			getBlockSupport( blockName, 'align' ),
			hasBlockSupport( blockName, 'alignWide', true )
		);

		const validAlignments = useAvailableAlignments(
			blockAllowedAlignments
		).map( ( { name } ) => name );
		const isContentLocked = useSelect(
			( select ) => {
				return select(
					blockEditorStore
				).__unstableGetContentLockingParent( props.clientId );
			},
			[ props.clientId ]
		);
		if ( ! validAlignments.length || isContentLocked ) {
			return blockEdit;
		}

		const updateAlignment = ( nextAlign ) => {
			if ( ! nextAlign ) {
				const blockType = getBlockType( props.name );
				const blockDefaultAlign = blockType?.attributes?.align?.default;
				if ( blockDefaultAlign ) {
					nextAlign = '';
				}
			}
			props.setAttributes( { align: nextAlign } );
		};

		return (
			<>
				<BlockControls group="block" __experimentalShareWithChildBlocks>
					<BlockAlignmentControl
						value={ props.attributes.align }
						onChange={ updateAlignment }
						controls={ validAlignments }
					/>
				</BlockControls>
				{ blockEdit }
			</>
		);
	},
	'withToolbarControls'
);

/**
 * Override the default block element to add alignment wrapper props.
 *
 * @param {Function} BlockListBlock Original component.
 *
 * @return {Function} Wrapped component.
 */
export const withDataAlign = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const { name, attributes } = props;
		const { align } = attributes;
		const blockAllowedAlignments = getValidAlignments(
			getBlockSupport( name, 'align' ),
			hasBlockSupport( name, 'alignWide', true )
		);
		const validAlignments = useAvailableAlignments(
			blockAllowedAlignments
		);

		// If an alignment is not assigned, there's no need to go through the
		// effort to validate or assign its value.
		if ( align === undefined ) {
			return <BlockListBlock { ...props } />;
		}

		let wrapperProps = props.wrapperProps;
		if (
			validAlignments.some( ( alignment ) => alignment.name === align )
		) {
			wrapperProps = { ...wrapperProps, 'data-align': align };
		}

		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}
);
export function AlignmentVisualizer( {
	value = 'none',
	allowedAlignments,
	clientId,
} ) {
	const layout = useLayout();
	const blockName = useSelect(
		( select ) => select( blockEditorStore ).getBlockName( clientId ),
		[ clientId ]
	);

	const [ editorWidth, setEditorWidth ] = useState( 0 );
	const ref = useRefEffect( ( node ) => {
		const { ownerDocument } = node;
		const { defaultView } = ownerDocument;
		const editorWrapperElement = ownerDocument.querySelector(
			'.editor-styles-wrapper'
		);
		const updateWidth = () =>
			setEditorWidth( editorWrapperElement.offsetWidth );
		updateWidth();

		const resizeObserver = defaultView.ResizeObserver
			? new defaultView.ResizeObserver( updateWidth )
			: undefined;
		resizeObserver?.observe( editorWrapperElement );

		return () => {
			resizeObserver?.disconnect();
		};
	}, [] );

	const blockAllowedAlignments = getValidAlignments(
		getBlockSupport( blockName, 'align' ),
		hasBlockSupport( blockName, 'alignWide', true )
	);

	// Allow override of `blockAllowedAlignments`. The image block doesn't use
	// alignment block supports, so this allows the image block to directly
	// declare what it supports.
	const availableAlignments = useAvailableAlignments(
		allowedAlignments ?? blockAllowedAlignments
	);

	const alignments = useMemo( () => {
		return [ 'none', 'wide', 'full' ]
			.map( ( name ) => {
				if ( name === 'none' ) {
					return {
						name,
						label: __( 'Content width' ),
						style: {
							width: layout.contentSize,
						},
					};
				}
				if ( name === 'wide' ) {
					return {
						name,
						label: __( 'Wide width' ),
						style: {
							width: layout.wideSize,
						},
					};
				}
				if ( name === 'full' ) {
					return {
						name,
						label: __( 'Full width' ),
						style: {
							width: '100%',
						},
					};
				}
				return null;
			} )
			.filter( ( alignment ) => alignment !== null );
	}, [ editorWidth, availableAlignments, layout ] );

	const wrapperStyle = useMemo( () => {
		const currentAlignment = alignments.find(
			( alignment ) => alignment.name === value
		);
		const offset = `calc( ( ${ editorWidth }px - ${ currentAlignment.style.width } ) / -2 )`;
		return {
			top: 0,
			bottom: 0,
			left: offset,
			right: offset,
		};
	}, [ alignments, editorWidth ] );

	return (
		<BlockPopover clientId={ clientId } __unstableCoverTarget>
			<div
				ref={ ref }
				className="block-editor__alignment-visualizer"
				style={ wrapperStyle }
			>
				{ alignments.map( ( alignment ) => (
					<div
						key={ alignment.name }
						className="block-editor__alignment-visualizer-step"
					>
						<div
							className="block-editor__alignment-visualizer-step-inner"
							style={ alignment.style }
						>
							<Popover
								className="block-editor__alignment-visualizer-step-label-popover"
								placement="top-end"
								flip
							>
								<div className="block-editor__alignment-visualizer-step-label">
									{ alignment.label }
								</div>
							</Popover>
						</div>
					</div>
				) ) }
			</div>
		</BlockPopover>
	);
}

/**
 * Override props assigned to save component to inject alignment class name if
 * block supports it.
 *
 * @param {Object} props      Additional props applied to save element.
 * @param {Object} blockType  Block type.
 * @param {Object} attributes Block attributes.
 *
 * @return {Object} Filtered props applied to save element.
 */
export function addAssignedAlign( props, blockType, attributes ) {
	const { align } = attributes;
	const blockAlign = getBlockSupport( blockType, 'align' );
	const hasWideBlockSupport = hasBlockSupport( blockType, 'alignWide', true );

	// Compute valid alignments without taking into account if
	// the theme supports wide alignments or not.
	// This way changing themes does not impact the block save.
	const isAlignValid = getValidAlignments(
		blockAlign,
		hasWideBlockSupport
	).includes( align );
	if ( isAlignValid ) {
		props.className = classnames( `align${ align }`, props.className );
	}

	return props;
}

addFilter(
	'blocks.registerBlockType',
	'core/align/addAttribute',
	addAttribute
);
addFilter(
	'editor.BlockListBlock',
	'core/editor/align/with-data-align',
	withDataAlign
);
addFilter(
	'editor.BlockEdit',
	'core/editor/align/with-toolbar-controls',
	withToolbarControls
);
addFilter(
	'blocks.getSaveContent.extraProps',
	'core/align/addAssignedAlign',
	addAssignedAlign
);
