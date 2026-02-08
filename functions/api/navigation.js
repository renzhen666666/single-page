// Pages Function for handling navigation requests
import navData from '../../../_data/navigation.json';

export async function onRequestPost(context) {
  try {
    return new Response(JSON.stringify({
      success: true,
      data: {
        nav: navData.nav || '',
        menu: navData.menu || ''
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in navigation function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to load navigation',
      data: { nav: '', menu: '' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}