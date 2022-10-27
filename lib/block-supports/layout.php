<?php
/**
 * Layout block support flag.
 *
 * @package gutenberg
 */

/**
 * Registers the layout block attribute for block types that support it.
 *
 * @param WP_Block_Type $block_type Block Type.
 */
function gutenberg_register_layout_support( $block_type ) {
	$support_layout = block_has_support( $block_type, array( '__experimentalLayout' ), false );
	if ( $support_layout ) {
		if ( ! $block_type->attributes ) {
			$block_type->attributes = array();
		}

		if ( ! array_key_exists( 'layout', $block_type->attributes ) ) {
			$block_type->attributes['layout'] = array(
				'type' => 'object',
			);
		}
	}
}

/**
 * Generates the CSS corresponding to the provided layout.
 *
 * @param string               $selector                      CSS selector.
 * @param array                $layout                        Layout object. The one that is passed has already checked
 *                                                            the existence of default block layout.
 * @param bool                 $has_block_gap_support         Optional. Whether the theme has support for the block gap. Default false.
 * @param string|string[]|null $gap_value                     Optional. The block gap value to apply. Default null.
 * @param bool                 $should_skip_gap_serialization Optional. Whether to skip applying the user-defined value set in the editor. Default false.
 * @param string               $fallback_gap_value            Optional. The block gap value to apply. Default '0.5em'.
 * @param array|null           $block_spacing                 Optional. Custom spacing set on the block. Default null.
 * @return string CSS styles on success. Else, empty string.
 */
function gutenberg_get_layout_style( $selector, $layout, $has_block_gap_support = false, $gap_value = null, $should_skip_gap_serialization = false, $fallback_gap_value = '0.5em', $block_spacing = null ) {
	$layout_type   = isset( $layout['type'] ) ? $layout['type'] : 'default';
	$layout_styles = array();

	if ( 'default' === $layout_type ) {
		if ( $has_block_gap_support ) {
			if ( is_array( $gap_value ) ) {
				$gap_value = isset( $gap_value['top'] ) ? $gap_value['top'] : null;
			}
			if ( null !== $gap_value && ! $should_skip_gap_serialization ) {
				// Get spacing CSS variable from preset value if provided.
				if ( is_string( $gap_value ) && str_contains( $gap_value, 'var:preset|spacing|' ) ) {
					$index_to_splice = strrpos( $gap_value, '|' ) + 1;
					$slug            = _wp_to_kebab_case( substr( $gap_value, $index_to_splice ) );
					$gap_value       = "var(--wp--preset--spacing--$slug)";
				}

				array_push(
					$layout_styles,
					array(
						'selector'     => "$selector > *",
						'declarations' => array(
							'margin-block-start' => '0',
							'margin-block-end'   => '0',
						),
					),
					array(
						'selector'     => "$selector$selector > * + *",
						'declarations' => array(
							'margin-block-start' => $gap_value,
							'margin-block-end'   => '0',
						),
					)
				);
			}
		}
	} elseif ( 'constrained' === $layout_type ) {
		$content_size    = isset( $layout['contentSize'] ) ? $layout['contentSize'] : '';
		$wide_size       = isset( $layout['wideSize'] ) ? $layout['wideSize'] : '';
		$justify_content = isset( $layout['justifyContent'] ) ? $layout['justifyContent'] : 'center';

		$all_max_width_value  = $content_size ? $content_size : $wide_size;
		$wide_max_width_value = $wide_size ? $wide_size : $content_size;

		// Make sure there is a single CSS rule, and all tags are stripped for security.
		// TODO: Use `safecss_filter_attr` instead - once https://core.trac.wordpress.org/ticket/46197 is patched.
		$all_max_width_value  = wp_strip_all_tags( explode( ';', $all_max_width_value )[0] );
		$wide_max_width_value = wp_strip_all_tags( explode( ';', $wide_max_width_value )[0] );

		$margin_left  = 'left' === $justify_content ? '0 !important' : 'auto !important';
		$margin_right = 'right' === $justify_content ? '0 !important' : 'auto !important';

		if ( $content_size || $wide_size ) {
			array_push(
				$layout_styles,
				array(
					'selector'     => "$selector > :where(:not(.alignleft):not(.alignright):not(.alignfull))",
					'declarations' => array(
						'max-width'    => $all_max_width_value,
						'margin-left'  => $margin_left,
						'margin-right' => $margin_right,
					),
				),
				array(
					'selector'     => "$selector > .alignwide",
					'declarations' => array( 'max-width' => $wide_max_width_value ),
				),
				array(
					'selector'     => "$selector .alignfull",
					'declarations' => array( 'max-width' => 'none' ),
				)
			);

			if ( isset( $block_spacing ) ) {
				$block_spacing_values = gutenberg_style_engine_get_styles(
					array(
						'spacing' => $block_spacing,
					)
				);

				/*
				 * Handle negative margins for alignfull children of blocks with custom padding set.
				 * They're added separately because padding might only be set on one side.
				 */
				if ( isset( $block_spacing_values['declarations']['padding-right'] ) ) {
					$padding_right   = $block_spacing_values['declarations']['padding-right'];
					$layout_styles[] = array(
						'selector'     => "$selector > .alignfull",
						'declarations' => array( 'margin-right' => "calc($padding_right * -1)" ),
					);
				}
				if ( isset( $block_spacing_values['declarations']['padding-left'] ) ) {
					$padding_left    = $block_spacing_values['declarations']['padding-left'];
					$layout_styles[] = array(
						'selector'     => "$selector > .alignfull",
						'declarations' => array( 'margin-left' => "calc($padding_left * -1)" ),
					);
				}
			}
		}

		if ( 'left' === $justify_content ) {
			$layout_styles[] = array(
				'selector'     => "$selector > :where(:not(.alignleft):not(.alignright):not(.alignfull))",
				'declarations' => array( 'margin-left' => '0 !important' ),
			);
		}

		if ( 'right' === $justify_content ) {
			$layout_styles[] = array(
				'selector'     => "$selector > :where(:not(.alignleft):not(.alignright):not(.alignfull))",
				'declarations' => array( 'margin-right' => '0 !important' ),
			);
		}

		if ( $has_block_gap_support ) {
			if ( is_array( $gap_value ) ) {
				$gap_value = isset( $gap_value['top'] ) ? $gap_value['top'] : null;
			}
			if ( null !== $gap_value && ! $should_skip_gap_serialization ) {
				// Get spacing CSS variable from preset value if provided.
				if ( is_string( $gap_value ) && str_contains( $gap_value, 'var:preset|spacing|' ) ) {
					$index_to_splice = strrpos( $gap_value, '|' ) + 1;
					$slug            = _wp_to_kebab_case( substr( $gap_value, $index_to_splice ) );
					$gap_value       = "var(--wp--preset--spacing--$slug)";
				}

				array_push(
					$layout_styles,
					array(
						'selector'     => "$selector > *",
						'declarations' => array(
							'margin-block-start' => '0',
							'margin-block-end'   => '0',
						),
					),
					array(
						'selector'     => "$selector$selector > * + *",
						'declarations' => array(
							'margin-block-start' => $gap_value,
							'margin-block-end'   => '0',
						),
					)
				);
			}
		}
	} elseif ( 'flex' === $layout_type ) {
		$layout_orientation = isset( $layout['orientation'] ) ? $layout['orientation'] : 'horizontal';

		$justify_content_options = array(
			'left'   => 'flex-start',
			'right'  => 'flex-end',
			'center' => 'center',
		);

		$vertical_alignment_options = array(
			'top'    => 'flex-start',
			'center' => 'center',
			'bottom' => 'flex-end',
		);

		if ( 'horizontal' === $layout_orientation ) {
			$justify_content_options += array( 'space-between' => 'space-between' );
		}

		if ( ! empty( $layout['flexWrap'] ) && 'nowrap' === $layout['flexWrap'] ) {
			$layout_styles[] = array(
				'selector'     => $selector,
				'declarations' => array( 'flex-wrap' => 'nowrap' ),
			);
		}

		if ( $has_block_gap_support && isset( $gap_value ) ) {
			$combined_gap_value = '';
			$gap_sides          = is_array( $gap_value ) ? array( 'top', 'left' ) : array( 'top' );

			foreach ( $gap_sides as $gap_side ) {
				$process_value = is_string( $gap_value ) ? $gap_value : _wp_array_get( $gap_value, array( $gap_side ), $fallback_gap_value );
				// Get spacing CSS variable from preset value if provided.
				if ( is_string( $process_value ) && str_contains( $process_value, 'var:preset|spacing|' ) ) {
					$index_to_splice = strrpos( $process_value, '|' ) + 1;
					$slug            = _wp_to_kebab_case( substr( $process_value, $index_to_splice ) );
					$process_value   = "var(--wp--preset--spacing--$slug)";
				}
				$combined_gap_value .= "$process_value ";
			}
			$gap_value = trim( $combined_gap_value );

			if ( null !== $gap_value && ! $should_skip_gap_serialization ) {
				$layout_styles[] = array(
					'selector'     => $selector,
					'declarations' => array( 'gap' => $gap_value ),
				);
			}
		}

		if ( 'horizontal' === $layout_orientation ) {
			/*
			 * Add this style only if is not empty for backwards compatibility,
			 * since we intend to convert blocks that had flex layout implemented
			 * by custom css.
			 */
			if ( ! empty( $layout['justifyContent'] ) && array_key_exists( $layout['justifyContent'], $justify_content_options ) ) {
				$layout_styles[] = array(
					'selector'     => $selector,
					'declarations' => array( 'justify-content' => $justify_content_options[ $layout['justifyContent'] ] ),
				);
			}

			if ( ! empty( $layout['verticalAlignment'] ) && array_key_exists( $layout['verticalAlignment'], $vertical_alignment_options ) ) {
				$layout_styles[] = array(
					'selector'     => $selector,
					'declarations' => array( 'align-items' => $vertical_alignment_options[ $layout['verticalAlignment'] ] ),
				);
			}
		} else {
			$layout_styles[] = array(
				'selector'     => $selector,
				'declarations' => array( 'flex-direction' => 'column' ),
			);
			if ( ! empty( $layout['justifyContent'] ) && array_key_exists( $layout['justifyContent'], $justify_content_options ) ) {
				$layout_styles[] = array(
					'selector'     => $selector,
					'declarations' => array( 'align-items' => $justify_content_options[ $layout['justifyContent'] ] ),
				);
			} else {
				$layout_styles[] = array(
					'selector'     => $selector,
					'declarations' => array( 'align-items' => 'flex-start' ),
				);
			}
		}
	}

	if ( ! empty( $layout_styles ) ) {
		/*
		 * Add to the style engine store to enqueue and render layout styles.
		 * Return compiled layout styles to retain backwards compatibility.
		 * Since https://github.com/WordPress/gutenberg/pull/42452,
		 * wp_enqueue_block_support_styles is no longer called in this block supports file.
		 */
		return gutenberg_style_engine_get_stylesheet_from_css_rules(
			$layout_styles,
			array(
				'context'  => 'block-supports',
				'prettify' => false,
			)
		);
	}

	return '';
}

/**
 * Gets classname from last tag in a string of HTML.
 *
 * @param string $html markup to be processed.
 * @return string String of inner wrapper classnames.
 */
function gutenberg_get_classnames_from_last_tag( $html ) {
	$tags            = new WP_HTML_Tag_Processor( $html );
	$last_classnames = '';

	while ( $tags->next_tag() ) {
		$last_classnames = $tags->get_attribute( 'class' );
	}

	return (string) $last_classnames;
}

/**
 * Renders the layout config to the block wrapper.
 *
 * @param  string $block_content Rendered block content.
 * @param  array  $block         Block object.
 * @return string                Filtered block content.
 */
function gutenberg_render_layout_support_flag( $block_content, $block ) {
	$block_type     = WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] );
	$support_layout = block_has_support( $block_type, array( '__experimentalLayout' ), false );

	if ( ! $support_layout ) {
		return $block_content;
	}

	$block_gap              = gutenberg_get_global_settings( array( 'spacing', 'blockGap' ) );
	$global_layout_settings = gutenberg_get_global_settings( array( 'layout' ) );
	$has_block_gap_support  = isset( $block_gap ) ? null !== $block_gap : false;
	$default_block_layout   = _wp_array_get( $block_type->supports, array( '__experimentalLayout', 'default' ), array() );
	$used_layout            = isset( $block['attrs']['layout'] ) ? $block['attrs']['layout'] : $default_block_layout;

	if ( isset( $used_layout['inherit'] ) && $used_layout['inherit'] ) {
		if ( ! $global_layout_settings ) {
			return $block_content;
		}
	}

	$class_names        = array();
	$layout_definitions = _wp_array_get( $global_layout_settings, array( 'definitions' ), array() );
	$container_class    = wp_unique_id( 'wp-container-' );
	$layout_classname   = '';

	// Set the correct layout type for blocks using legacy content width.
	if ( isset( $used_layout['inherit'] ) && $used_layout['inherit'] || isset( $used_layout['contentSize'] ) && $used_layout['contentSize'] ) {
		$used_layout['type'] = 'constrained';
	}

	if (
		gutenberg_get_global_settings( array( 'useRootPaddingAwareAlignments' ) ) &&
		isset( $used_layout['type'] ) &&
		'constrained' === $used_layout['type']
	) {
		$class_names[] = 'has-global-padding';
	}

	/*
	 * The following section was added to reintroduce a small set of layout classnames that were
	 * removed in the 5.9 release (https://github.com/WordPress/gutenberg/issues/38719). It is
	 * not intended to provide an extended set of classes to match all block layout attributes
	 * here.
	 */
	if ( ! empty( $block['attrs']['layout']['orientation'] ) ) {
		$class_names[] = 'is-' . sanitize_title( $block['attrs']['layout']['orientation'] );
	}

	if ( ! empty( $block['attrs']['layout']['justifyContent'] ) ) {
		$class_names[] = 'is-content-justification-' . sanitize_title( $block['attrs']['layout']['justifyContent'] );
	}

	if ( ! empty( $block['attrs']['layout']['flexWrap'] ) && 'nowrap' === $block['attrs']['layout']['flexWrap'] ) {
		$class_names[] = 'is-nowrap';
	}

	// Get classname for layout type.
	if ( isset( $used_layout['type'] ) ) {
		$layout_classname = _wp_array_get( $layout_definitions, array( $used_layout['type'], 'className' ), '' );
	} else {
		$layout_classname = _wp_array_get( $layout_definitions, array( 'default', 'className' ), '' );
	}

	if ( $layout_classname && is_string( $layout_classname ) ) {
		$class_names[] = sanitize_title( $layout_classname );
	}

	/*
	 * Only generate Layout styles if the theme has not opted-out.
	 * Attribute-based Layout classnames are output in all cases.
	 */
	if ( ! current_theme_supports( 'disable-layout-styles' ) ) {

		$gap_value = _wp_array_get( $block, array( 'attrs', 'style', 'spacing', 'blockGap' ) );

		/*
		 * Skip if gap value contains unsupported characters.
		 * Regex for CSS value borrowed from `safecss_filter_attr`, and used here
		 * to only match against the value, not the CSS attribute.
		 */
		if ( is_array( $gap_value ) ) {
			foreach ( $gap_value as $key => $value ) {
				$gap_value[ $key ] = $value && preg_match( '%[\\\(&=}]|/\*%', $value ) ? null : $value;
			}
		} else {
			$gap_value = $gap_value && preg_match( '%[\\\(&=}]|/\*%', $gap_value ) ? null : $gap_value;
		}

		$fallback_gap_value = _wp_array_get( $block_type->supports, array( 'spacing', 'blockGap', '__experimentalDefault' ), '0.5em' );
		$block_spacing      = _wp_array_get( $block, array( 'attrs', 'style', 'spacing' ), null );

		/*
		 * If a block's block.json skips serialization for spacing or spacing.blockGap,
		 * don't apply the user-defined value to the styles.
		 */
		$should_skip_gap_serialization = gutenberg_should_skip_block_supports_serialization( $block_type, 'spacing', 'blockGap' );

		$style = gutenberg_get_layout_style(
			".$container_class.$container_class",
			$used_layout,
			$has_block_gap_support,
			$gap_value,
			$should_skip_gap_serialization,
			$fallback_gap_value,
			$block_spacing
		);

		// Only add container class and enqueue block support styles if unique styles were generated.
		if ( ! empty( $style ) ) {
			$class_names[] = $container_class;
		}
	}

	/**
	* The first chunk of innerContent contains the block markup up until the inner blocks start.
	* We want to target the opening tag of the inner blocks wrapper, which is the last tag in that chunk.
	*/
	$inner_content_classnames = isset( $block['innerContent'][0] ) && 'string' === gettype( $block['innerContent'][0] ) ? gutenberg_get_classnames_from_last_tag( $block['innerContent'][0] ) : '';

	$content = new WP_HTML_Tag_Processor( $block_content );
	if ( $inner_content_classnames ) {
		$content->next_tag( array( 'class_name' => $inner_content_classnames ) );
		foreach ( $class_names as $class_name ) {
			$content->add_class( $class_name );
		}
	} else {
		$content->next_tag();
		$content->add_class( implode( ' ', $class_names ) );
	}

	return (string) $content;
}

// Register the block support. (overrides core one).
WP_Block_Supports::get_instance()->register(
	'layout',
	array(
		'register_attribute' => 'gutenberg_register_layout_support',
	)
);

if ( function_exists( 'wp_render_layout_support_flag' ) ) {
	remove_filter( 'render_block', 'wp_render_layout_support_flag' );
}
add_filter( 'render_block', 'gutenberg_render_layout_support_flag', 10, 2 );

/**
 * Generates the CSS for layout position support from the style object.
 *
 * @param string $selector CSS selector.
 * @param array  $style    Style object.
 * @return string CSS styles on success. Else, empty string.
 */
function gutenberg_get_layout_position_style( $selector, $style ) {
	$position_styles = array();
	$position_type   = _wp_array_get( $style, array( 'layout', 'position' ), '' );

	if (
		in_array( $position_type, array( 'fixed', 'sticky' ), true )
	) {
		$sides = array( 'top', 'right', 'bottom', 'left' );

		foreach ( $sides as $side ) {
			$side_value = _wp_array_get( $style, array( 'layout', $side ) );
			if ( null !== $side_value ) {
				/*
				* For fixed or sticky top positions,
				* ensure the value includes an offset for the logged in admin bar.
				*/
				if (
					'top' === $side &&
					'fixed' === $position_type ||
					'sticky' === $position_type
				) {
					// TODO: wrap the following value in a `calc()` + `$side_value`,
					// so that any included value is treated as an offset.
					$side_value = 'var(--wp-admin--admin-bar--height, 0px)';
				}

				$position_styles[] =
					array(
						'selector'     => "$selector",
						'declarations' => array(
							$side => $side_value,
						),
					);
			}
		}

		$position_styles[] =
			array(
				'selector'     => "$selector",
				'declarations' => array(
					'position' => $position_type,
					'z-index'  => '250', // TODO: This hard-coded value should live somewhere else.
				),
			);
	}

	if ( ! empty( $position_styles ) ) {
		/*
		 * Add to the style engine store to enqueue and render layout styles.
		 */
		return gutenberg_style_engine_get_stylesheet_from_css_rules(
			$position_styles,
			array(
				'context'  => 'block-supports',
				'prettify' => false,
			)
		);
	}

	return '';
}

/**
 * Renders layout position styles to the block wrapper.
 *
 * Position related styles should always be applied to the outer wrapper,
 * so this logic is separate from the layout support's innerBlocks wrapper logic.
 *
 * @param  string $block_content Rendered block content.
 * @param  array  $block         Block object.
 * @return string                Filtered block content.
 */
function gutenberg_render_layout_position_support( $block_content, $block ) {
	$block_type                  = WP_Block_Type_Registry::get_instance()->get_registered( $block['blockName'] );
	$has_layout_position_support = block_has_support( $block_type, array( '__experimentalLayout', 'allowPosition' ), false );

	if (
		! $has_layout_position_support ||
		empty( $block['attrs']['style']['layout'] )
	) {
		return $block_content;
	}

	$style_attribute = _wp_array_get( $block, array( 'attrs', 'style' ), null );
	$class_name      = wp_unique_id( 'wp-container-' );
	$style           = gutenberg_get_layout_position_style( ".$class_name.$class_name", $style_attribute );

	if ( ! empty( $style ) ) {
		$content = new WP_HTML_Tag_Processor( $block_content );
		$content->next_tag();
		$content->add_class( $class_name );
		return (string) $content;
	}
	return $block_content;
}

if ( function_exists( 'wp_render_layout_position_support' ) ) {
	remove_filter( 'render_block', 'wp_render_layout_position_support' );
}
add_filter( 'render_block', 'gutenberg_render_layout_position_support', 10, 2 );

/**
 * For themes without theme.json file, make sure
 * to restore the inner div for the group block
 * to avoid breaking styles relying on that div.
 *
 * @param  string $block_content Rendered block content.
 * @param  array  $block         Block object.
 * @return string                Filtered block content.
 */
function gutenberg_restore_group_inner_container( $block_content, $block ) {
	$tag_name                         = isset( $block['attrs']['tagName'] ) ? $block['attrs']['tagName'] : 'div';
	$group_with_inner_container_regex = sprintf(
		'/(^\s*<%1$s\b[^>]*wp-block-group(\s|")[^>]*>)(\s*<div\b[^>]*wp-block-group__inner-container(\s|")[^>]*>)((.|\S|\s)*)/U',
		preg_quote( $tag_name, '/' )
	);
	if (
		WP_Theme_JSON_Resolver_Gutenberg::theme_has_support() ||
		1 === preg_match( $group_with_inner_container_regex, $block_content ) ||
		( isset( $block['attrs']['layout']['type'] ) && 'flex' === $block['attrs']['layout']['type'] )
	) {
		return $block_content;
	}

	$replace_regex   = sprintf(
		'/(^\s*<%1$s\b[^>]*wp-block-group[^>]*>)(.*)(<\/%1$s>\s*$)/ms',
		preg_quote( $tag_name, '/' )
	);
	$updated_content = preg_replace_callback(
		$replace_regex,
		function( $matches ) {
			return $matches[1] . '<div class="wp-block-group__inner-container">' . $matches[2] . '</div>' . $matches[3];
		},
		$block_content
	);
	return $updated_content;
}

if ( function_exists( 'wp_restore_group_inner_container' ) ) {
	remove_filter( 'render_block', 'wp_restore_group_inner_container', 10, 2 );
	remove_filter( 'render_block_core/group', 'wp_restore_group_inner_container', 10, 2 );
}
add_filter( 'render_block_core/group', 'gutenberg_restore_group_inner_container', 10, 2 );


/**
 * For themes without theme.json file, make sure
 * to restore the outer div for the aligned image block
 * to avoid breaking styles relying on that div.
 *
 * @param string $block_content Rendered block content.
 * @param  array  $block        Block object.
 * @return string Filtered block content.
 */
function gutenberg_restore_image_outer_container( $block_content, $block ) {
	$image_with_align = "
/# 1) everything up to the class attribute contents
(
	^\s*
	<figure\b
	[^>]*
	\bclass=
	[\"']
)
# 2) the class attribute contents
(
	[^\"']*
	\bwp-block-image\b
	[^\"']*
	\b(?:alignleft|alignright|aligncenter)\b
	[^\"']*
)
# 3) everything after the class attribute contents
(
	[\"']
	[^>]*
	>
	.*
	<\/figure>
)/iUx";

	if (
		WP_Theme_JSON_Resolver::theme_has_support() ||
		0 === preg_match( $image_with_align, $block_content, $matches )
	) {
		return $block_content;
	}

	$wrapper_classnames = array( 'wp-block-image' );

	// If the block has a classNames attribute these classnames need to be removed from the content and added back
	// to the new wrapper div also.
	if ( ! empty( $block['attrs']['className'] ) ) {
		$wrapper_classnames = array_merge( $wrapper_classnames, explode( ' ', $block['attrs']['className'] ) );
	}
	$content_classnames          = explode( ' ', $matches[2] );
	$filtered_content_classnames = array_diff( $content_classnames, $wrapper_classnames );

	return '<div class="' . implode( ' ', $wrapper_classnames ) . '">' . $matches[1] . implode( ' ', $filtered_content_classnames ) . $matches[3] . '</div>';
}

if ( function_exists( 'wp_restore_image_outer_container' ) ) {
	remove_filter( 'render_block_core/image', 'wp_restore_image_outer_container', 10, 2 );
}
add_filter( 'render_block_core/image', 'gutenberg_restore_image_outer_container', 10, 2 );
