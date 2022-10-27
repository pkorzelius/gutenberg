/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { Popover } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import {
	createPortal,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { BlockList } from '../';
import { useLayout, LayoutStyle } from '../block-list/layout';
import { __unstableUseBlockElement as useBlockElement } from '../block-list/use-block-props/use-block-refs';
import useAvailableAlignments from '../block-alignment-control/use-available-alignments';
import { store as blockEditorStore } from '../../store';
import { getValidAlignments } from '../../hooks/align';

export default function BlockAlignmentVisualizer( {
	allowedAlignments,
	clientId,
} ) {
	const layout = useLayout();
	const { blockName, parentClientId, parentBlockName } = useSelect(
		( select ) => {
			const { getBlockName, getBlockRootClientId } =
				select( blockEditorStore );

			const rootClientId = getBlockRootClientId( clientId );

			return {
				blockName: getBlockName( clientId ),
				parentClientId: rootClientId,
				parentBlockName: getBlockName( rootClientId ),
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
			<Iframe
				style={ coverElementStyle }
				className="block-editor__alignment-visualizer-iframe"
			>
				<head>
					<style>
						{ `
							html {
								overflow: hidden;
								width: 100%;
								height: 100%;
							}

							body {
								position: absolute;
								margin: 0;
								top: 0;
								left: 0;
								right: 0;
								bottom: 0;
							}

							.block-editor__alignment-visualizer-step {
								position: absolute;
								top: 0;
								bottom: 0;
								left: 0;
								right: 0;
							}

							.block-editor__alignment-visualizer-step-inner {
								pointer-events: none !important;
								height: 100%;
								max-width: 100%;
								margin: 0 auto;
								opacity: 0.7;
								border-left: solid 2px blue;
								border-right: solid 2px blue;
							}
						` }
					</style>
					<LayoutStyle
						blockName={ parentBlockName }
						layout={ layout }
						selector=".block-editor__alignment-visualizer-step"
					/>
				</head>
				<body className="editor-styles-wrapper">
					{ alignments.map( ( alignment ) => (
						<div
							key={ alignment.name }
							className={ classnames(
								'block-editor__alignment-visualizer-step',
								{
									[ `is-content-justification-${ layout.justifyContent }` ]:
										layout.justifyContent,
								}
							) }
						>
							<div
								className={ classnames(
									'block-editor__alignment-visualizer-step-inner',
									alignment.className
								) }
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
				</body>
			</Iframe>
		</Popover>
	);
}

function Iframe( { children, ...props } ) {
	const [ ref, setRef ] = useState( null );
	const iframeDocument = ref?.contentDocument?.documentElement;

	return (
		<iframe
			ref={ setRef }
			// Correct doctype is required to enable rendering in standards mode
			srcDoc="<!doctype html>"
			title={ __( 'Alignment visualizer' ) }
			{ ...props }
		>
			{ iframeDocument && createPortal( children, iframeDocument ) }
		</iframe>
	);
}
