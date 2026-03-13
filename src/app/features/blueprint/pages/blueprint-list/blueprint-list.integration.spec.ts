import { render, screen } from '@testing-library/angular';

import { BlueprintList } from './blueprint-list';
import { BlueprintService } from '../../services/blueprint.service';

describe('BlueprintList (Integration)', () => {
  it('should display heading', async () => {
    await render(BlueprintList);

    expect(screen.getByRole('heading', { name: /blueprint articles/i })).toBeTruthy();
  });

  it('should display empty state when no articles', async () => {
    await render(BlueprintList);

    expect(screen.getByText('No articles found.')).toBeTruthy();
  });

  it('should display article count and list when articles exist', async () => {
    const { fixture } = await render(BlueprintList);
    const service = fixture.debugElement.injector.get(BlueprintService);

    service.setArticles([
      { articleId: 'a1', name: 'First Article', description: 'Description 1' },
      { articleId: 'a2', name: 'Second Article', description: 'Description 2' },
    ]);
    fixture.detectChanges();

    expect(screen.getByText(/2 of 2 articles/)).toBeTruthy();
    expect(screen.getByText('First Article')).toBeTruthy();
    expect(screen.getByText('Second Article')).toBeTruthy();
  });

  it('should display loading state', async () => {
    const { fixture } = await render(BlueprintList);
    const service = fixture.debugElement.injector.get(BlueprintService);

    service.setLoading(true);
    fixture.detectChanges();

    expect(screen.getByText(/loading/i)).toBeTruthy();
  });
});
