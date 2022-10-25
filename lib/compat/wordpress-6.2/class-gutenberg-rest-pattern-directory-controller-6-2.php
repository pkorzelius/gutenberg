<?php
// TODO: add docs/comments..

class Gutenberg_REST_Pattern_Directory_Controller_6_2 extends Gutenberg_REST_Pattern_Directory_Controller_6_0 {
	/**
	 * Registers the necessary REST API routes.
	 *
	 * @since 5.8.0
	 * @since 6.2.0 Added pattern directory categories endpoint.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/categories',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_pattern_categories' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
				)
			),
		);

		parent::register_routes();
	}

	public function get_pattern_categories( $request ) {
		// TODO: check about transient and if needed with locale..
		// $transient_key = $this->get_transient_key( $query_args );

		// /*
		//  * Use network-wide transient to improve performance. The locale is the only site
		//  * configuration that affects the response, and it's included in the transient key.
		//  */
		// $raw_patterns = get_site_transient( $transient_key );
		// if ( ! $raw_patterns ) {
		$api_url = 'http://api.wordpress.org/patterns/1.0/?categories';
		if ( wp_http_supports( array( 'ssl' ) ) ) {
			$api_url = set_url_scheme( $api_url, 'https' );
		}

		/*
		* Default to a short TTL, to mitigate cache stampedes on high-traffic sites.
		* This assumes that most errors will be short-lived, e.g., packet loss that causes the
		* first request to fail, but a follow-up one will succeed. The value should be high
		* enough to avoid stampedes, but low enough to not interfere with users manually
		* re-trying a failed request.
		*/
		$cache_ttl      = 5;
		$wporg_response = wp_remote_get( $api_url );
		$raw_patterns   = json_decode( wp_remote_retrieve_body( $wporg_response ) );

		if ( is_wp_error( $wporg_response ) ) {
			$raw_patterns = $wporg_response;

		} elseif ( ! is_array( $raw_patterns ) ) {
			// HTTP request succeeded, but response data is invalid.
			$raw_patterns = new WP_Error(
				'pattern_api_failed',
				sprintf(
					/* translators: %s: Support forums URL. */
					__( 'An unexpected error occurred. Something may be wrong with WordPress.org or this server&#8217;s configuration. If you continue to have problems, please try the <a href="%s">support forums</a>.' ),
					__( 'https://wordpress.org/support/forums/' )
				),
				array(
					'response' => wp_remote_retrieve_body( $wporg_response ),
				)
			);

		} else {
			// Response has valid data.
			$cache_ttl = HOUR_IN_SECONDS;
		}

		// set_site_transient( $transient_key, $raw_patterns, $cache_ttl );
		// }

		if ( is_wp_error( $raw_patterns ) ) {
			$raw_patterns->add_data( array( 'status' => 500 ) );

			return $raw_patterns;
		}

		$response = array();

		if ( $raw_patterns ) {
			foreach ( $raw_patterns as $pattern ) {
				$response[] = $this->prepare_response_for_collection(
					$this->prepare_pattern_category_for_response( $pattern, $request )
				);
			}
		}

		return new WP_REST_Response( $response );
	}

	public function prepare_pattern_category_for_response( $category , $request) {
		$raw_pattern      = $category;
		$prepared_pattern = array(
			'id'   => absint( $raw_pattern->id ),
			'name' => sanitize_text_field( $raw_pattern->name ),
			'slug' => sanitize_text_field( $raw_pattern->slug )
		);

		$prepared_pattern = $this->add_additional_fields_to_object( $prepared_pattern, $request );

		return new WP_REST_Response( $prepared_pattern );
	}

	public function get_collection_params() {
		$query_params = parent::get_collection_params();

		$query_params['page'] = array(
			'description'       => __( 'Current page of the collection.' ),
			'type'              => 'integer',
			'default'           => 1,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
			'minimum'           => 1,
		);
		$query_params['per_page'] = array(
			'description'       => __( 'Maximum number of items to be returned in result set.' ),
			'type'              => 'integer',
			'default'           => 10,
			'minimum'           => 1,
			'maximum'           => 100,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		);

		/**
		 * Filter collection parameters for the block pattern directory controller.
		 *
		 * @since 5.8.0
		 *
		 * @param array $query_params JSON Schema-formatted collection parameters.
		 */
		return apply_filters( 'rest_pattern_directory_collection_params', $query_params );
	}
}
