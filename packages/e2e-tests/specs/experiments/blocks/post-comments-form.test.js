/**
 * WordPress dependencies
 */
import {
	insertBlock,
	activateTheme,
	setOption,
	visitSiteEditor,
	deleteAllTemplates,
	canvas,
} from '@wordpress/e2e-test-utils';

describe( 'Post Comments Form', () => {
	beforeAll( async () => {
		await activateTheme( 'emptytheme' );
		await deleteAllTemplates( 'wp_template' );
	} );

	describe( 'placeholder', () => {
		it( 'displays in site editor even when comments are closed by default', async () => {
			await setOption( 'default_comment_status', 'closed' );

			// Navigate to "Singular" post template
			await visitSiteEditor();
			await expect( page ).toClick(
				'.edit-site-sidebar-navigation-item',
				{ text: /templates/i }
			);
			await expect( page ).toClick( '.components-heading > a', {
				text: /singular/i,
			} );

			// Insert post comments form
			await insertBlock( 'Post Comments Form' );

			// Ensure the placeholder is there
			await expect( canvas() ).toMatchElement(
				'.wp-block-post-comments-form .comment-form'
			);
		} );
	} );
} );
