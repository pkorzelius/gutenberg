/**
 * Internal dependencies
 */
import border from './border';
import color from './color';
import shadow from './shadow';
import outline from './outline';
import dimensions from './dimensions';
import spacing from './spacing';
import typography from './typography';

export const styleDefinitions = [
	...border,
	...color,
	...outline,
	...dimensions,
	...spacing,
	...typography,
	...shadow,
];
