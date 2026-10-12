import { test, expect } from "@playwright/test";
test("original business selector, 100 beds, persistence, reservation movement and checkout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Otel Seçimi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /E2E Hotel.*Merkez/ }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/original-login.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /E2E Hotel.*Merkez/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Yönetici", exact: true }).click();
  await page.getByLabel("Şifre", { exact: true }).fill("isolated-e2e-password");
  await page.getByRole("button", { name: "SİSTEME GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "Oda Durum Çizelgesi", exact: true }),
  ).toBeVisible();
  const api = async (code: string, payload: unknown, method = "POST") => {
    const response = await page.request.fetch("/action", {
      method,
      headers: { "X-Requested-With": "INTERACTIVEOTEL" },
      data: { version: "1", code, payload },
    });
    const result = await response.json();
    expect(response.ok(), JSON.stringify(result)).toBeTruthy();
    return result.data;
  };
  const hotelID = await page.getByLabel("Otel seçimi").inputValue();
  const name = `E2E Tesis ${Date.now()}`;
  const branch = await api("branch.create", {
    hotel_id: hotelID,
    name,
    description: {},
    assets: [],
    feature_assignments: [],
  });
  await page.getByRole("button", { name: "Yenile", exact: true }).click();
  await expect(
    page.getByLabel("Tesis seçimi").getByRole("option", { name, exact: true }),
  ).toBeAttached();
  await page.getByLabel("Tesis seçimi").selectOption(branch.branch_id);
  await page
    .getByRole("button", { name: "SİSTEM AYARLARI", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kat ve Oda Tanımları", exact: true })
    .click();
  await page.getByRole("button", { name: "Kat Ekle", exact: true }).click();
  await page.getByLabel("Kat kodu", { exact: true }).fill("3");
  await page.getByLabel("Kat adı", { exact: true }).fill("3. Kat");
  await page.getByRole("button", { name: "Katı Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kat ve Oda Tanımları", exact: true })
    .click();
  await page.getByRole("button", { name: "Toplu Oda / Yatak Ekle" }).click();
  await expect(page.getByLabel("Birim sayısı", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByRole("button", { name: "100 Birimi Oluştur" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row")).toHaveCount(101);
  await expect(
    page.getByRole("cell", { name: "Y-100", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Tesis seçimi")).toHaveValue(branch.branch_id);
  await expect(
    page.getByText("100 birim", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rezervasyon Al", exact: true })
    .click();
  await page.getByLabel("Rezervasyon sahibi").fill("E2E Misafir");
  await page
    .getByLabel("Kiralanacak birim")
    .selectOption({ label: "Y-001 · Yatak · 1 kişi" });
  await page.getByRole("button", { name: "Rezervasyonu Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Rezervasyon Listesi", exact: true })
    .first()
    .click();
  let row = page.getByRole("row").filter({
    has: page.getByRole("button", { name: "E2E Misafir", exact: true }),
  });
  await row.getByRole("button", { name: "Giriş", exact: true }).click();
  await expect(row.getByText("Konaklıyor", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Taşı / Değiştir" }).click();
  await page
    .getByLabel("Hedef birim")
    .selectOption({ label: "Y-002 · Yatak · 1 kişi" });
  await page.getByRole("button", { name: "Değişikliği Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    row.getByRole("cell", { name: "Y-002", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "E2E Misafir", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Y-001", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Y-002", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pencereyi kapat" }).click();
  await row.getByRole("button", { name: "Çıkış", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Onayla" })
    .click();
  await expect(row.getByText("Çıkış yapıldı", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Oda Durum Çizelgesi", exact: true })
    .first()
    .click();
  await page.getByLabel("Kat filtresi").selectOption({ label: "3. Kat" });
  await page.getByRole("button", { name: "Kat Planı", exact: true }).click();
  await page.getByRole("button", { name: "Planı Düzenle" }).click();
  const unit = page.getByRole("button", {
    name: "Y-001 Yatak · 1. seviye",
    exact: true,
  });
  await expect(unit).toBeVisible();
  const box = await unit.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 20,
      box.y + box.height / 2 + 10,
      { steps: 5 },
    );
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Planı Kaydet" }).click();
  await expect(
    page.getByRole("button", { name: "Planı Düzenle" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/floor-plan.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Oturumu Kapat", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Otel Seçimi" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(name) }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("feature assignment and multiple localized images persist through the forms", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /E2E Hotel.*Merkez/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Yönetici", exact: true }).click();
  await page.getByLabel("Şifre", { exact: true }).fill("isolated-e2e-password");
  await page.getByRole("button", { name: "SİSTEME GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "Oda Durum Çizelgesi", exact: true }),
  ).toBeVisible();
  const api = async (code: string, payload: unknown) => {
    const resp = await page.request.post("/action", {
      headers: { "X-Requested-With": "INTERACTIVEOTEL" },
      data: { version: "1", code, payload },
    });
    const envelope = await resp.json();
    expect(resp.ok(), JSON.stringify(envelope)).toBeTruthy();
    return envelope.data;
  };
  const suffix = Date.now().toString();
  const hotel = await api("hotel.create", {
    name: `Medya Oteli ${suffix}`,
    description: {},
    assets: [],
  });
  const branch = await api("branch.create", {
    hotel_id: hotel.hotel_id,
    name: "Merkez",
    description: {},
    assets: [],
    feature_assignments: [],
  });
  await page.getByRole("button", { name: "Yenile", exact: true }).click();
  await page.getByLabel("Otel seçimi").selectOption(hotel.hotel_id);
  await expect(page.getByLabel("Tesis seçimi")).toHaveValue(branch.branch_id);
  await page
    .getByRole("button", { name: "SİSTEM AYARLARI", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Olanak Tanımları", exact: true })
    .click();
  await page.getByRole("button", { name: "Kategori Ekle" }).click();
  await page.getByLabel("Kod", { exact: true }).fill("comfort");
  await page.getByLabel("Kategori adı").fill("Konfor");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Özellik Ekle" }).click();
  await page.getByLabel("Kod", { exact: true }).fill("jacuzzi");
  await page.getByLabel("Başlık", { exact: true }).fill("Jakuzi");
  await page.getByRole("button", { name: "Özelliği Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kat ve Oda Tanımları", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Oda / Birim Ekle", exact: true })
    .click();
  await page.getByLabel("Birim kodu", { exact: true }).fill("101");
  await page.getByLabel("Jakuzi", { exact: true }).selectOption("true");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByLabel("Medya dosyalarını yükle").setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: png },
    { name: "second.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByLabel("Medya 2 başlık TR")).toBeVisible();
  await page.getByLabel("Medya 1 başlık TR").fill("Oda görünümü");
  await page.getByLabel("Medya 1 açıklama TR").fill("Jakuzi bulunan oda.");
  await page.getByLabel("Medya metinlerinin dili").selectOption("EN");
  await page.getByLabel("Medya 1 başlık EN").fill("Room view");
  await page.getByRole("button", { name: "Birimi Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "101 düzenle", exact: true }).click();
  await expect(page.getByLabel("Jakuzi", { exact: true })).toHaveValue("true");
  await expect(page.getByLabel("Medya 1 başlık TR")).toHaveValue(
    "Oda görünümü",
  );
  await expect(page.getByLabel("Medya 2 başlık TR")).toBeVisible();
  await page.getByLabel("Medya metinlerinin dili").selectOption("EN");
  await expect(page.getByLabel("Medya 1 başlık EN")).toHaveValue("Room view");
  await page.screenshot({
    path: "test-results/room-media.png",
    fullPage: true,
  });
});
