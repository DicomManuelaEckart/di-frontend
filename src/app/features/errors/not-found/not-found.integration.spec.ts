import { render, screen } from '@testing-library/angular';

import { NotFound } from './not-found';

describe('NotFound (Integration)', () => {
  it('should display 404 heading', async () => {
    await render(NotFound);

    expect(screen.getByRole('heading', { name: /404/i })).toBeTruthy();
  });

  it('should display informative message', async () => {
    await render(NotFound);

    expect(screen.getByText(/the requested page does not exist/i)).toBeTruthy();
  });
});
