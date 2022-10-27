/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Popover } from '@wordpress/components';
import { useContext, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { BlockList } from '../';
import { useLayout } from '../block-list/layout';
import { __unstableUseBlockElement as useBlockElement } from '../block-list/use-block-props/use-block-refs';
import useAvailableAlignments from '../block-alignment-control/use-available-alignments';
import { store as blockEditorStore } from '../../store';
import { getValidAlignments } from '../../hooks/align';

export default function BlockAlignmentVisualizer( {
	allowedAlignments,
	clientId,
} ) {
	const layout = useLayout();
	const { blockName, parentClientId } = useSelect(
		( select ) => {
			const { getBlockName, getBlockRootClientId } =
				select( blockEditorStore );

			return {
				blockName: getBlockName( clientId ),
				parentClientId: getBlockRootClientId( clientId ),
			};
		},
		[ clientId ]
	);

	const [ popoverAnchor, setPopoverAnchor ] = useState( null );
	const [ coverElementStyle, setCoverElementStyle ] = useState( null );
	const blockElement = useBlockElement( clientId );
	const parentBlockElement = useBlockElement( parentClientId );
	const rootBlockListElement = useContext(
		BlockList.__unstableElementContext
	);

	useEffect( () => {
		const parentElement = parentBlockElement ?? rootBlockListElement;
		if ( ! blockElement || ! parentElement ) {
			return;
		}

		const { ownerDocument } = blockElement;
		const { defaultView } = ownerDocument;

		const update = () => {
			setPopoverAnchor( {
				ownerDocument,
				getBoundingClientRect() {
					const parentRect = parentElement.getBoundingClientRect();
					const blockRect = blockElement.getBoundingClientRect();

					// Produce a rect that has:
					// - the horizontal positioning/height of the parent block.
					// - the vertical positioning/height of the current block.
					//
					// These are the dimensions of our fake 'block list'.
					return new defaultView.DOMRect(
						parentRect.x,
						blockRect.y,
						parentRect.width,
						blockRect.height
					);
				},
			} );

			setCoverElementStyle( {
				position: 'absolute',
				width: parentElement.offsetWidth,
				height: blockElement.offsetHeight,
			} );
		};

		const resizeObserver = defaultView.ResizeObserver
			? new defaultView.ResizeObserver( update )
			: undefined;
		resizeObserver?.observe( parentElement );
		resizeObserver?.observe( blockElement );
		update();

		return () => {
			resizeObserver?.disconnect();
		};
	}, [ blockElement, parentBlockElement, rootBlockListElement ] );

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
		return availableAlignments
			.map( ( { name } ) => {
				if ( name === 'none' ) {
					return {
						name,
						label: __( 'Content width' ),
					};
				}
				if ( name === 'wide' ) {
					return {
						name,
						label: __( 'Wide width' ),
						className: 'alignwide',
					};
				}
				if ( name === 'full' ) {
					return {
						name,
						label: __( 'Full width' ),
						className: 'alignfull',
					};
				}
				return null;
			} )
			.filter( ( alignment ) => alignment !== null );
	}, [ availableAlignments, layout ] );

	if ( availableAlignments?.length === 0 ) {
		return null;
	}

	return (
		<Popover
			anchor={ popoverAnchor }
			placement="top-start"
			animate={ false }
			focusOnMount={ false }
			flip={ false }
			resize={ false }
		>
			<div
				className="block-editor__alignment-visualizer"
				style={ coverElementStyle }
			>
				{ alignments.map( ( alignment ) => (
					<div
						key={ alignment.name }
						className={ classnames(
							'block-editor__alignment-visualizer-step',
							'block-editor-block-list__layout',
							{
								[ `is-content-justification-${ layout.justifyContent }` ]:
									layout.justifyContent,
							}
						) }
					>
						<div className={ classnames( alignment.className ) }>
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
		</Popover>
	);
}
