import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

test("staff, physical bunk beds, individual guests, documents, exports, soft delete and hotel logs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push(`Native dialog: ${d.type()}`);
    void d.dismiss();
  });
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
  const api = async (code: string, payload: unknown, method = "POST") => {
    const response = await page.request.fetch(
      method === "GET"
        ? `/action?${new URLSearchParams({ version: "1", code, payload: JSON.stringify(payload) })}`
        : "/action",
      {
        method,
        headers: { "X-Requested-With": "INTERACTIVEOTEL" },
        ...(method === "GET" ? {} : { data: { version: "1", code, payload } }),
      },
    );
    const body = await response.json();
    expect(response.ok(), JSON.stringify(body)).toBeTruthy();
    return body.data;
  };
  const suffix = Date.now().toString();
  const hotel = await api("hotel.create", {
    name: `Enterprise ${suffix}`,
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
  const floor = await api("floor.create", {
    branch_id: branch.branch_id,
    code: "1",
    label: { TR: "1. Kat" },
    width: 2400,
    height: 1600,
    sort_order: 1,
  });
  const room = await api("room.create", {
    branch_id: branch.branch_id,
    floor_id: floor.floor_id,
    code: "501",
    kind: "dormitory",
    capacity: 4,
    rentable: true,
    status: "Temiz",
    position: { x: 20, y: 20, width: 140, height: 100 },
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
    .getByRole("button", { name: "Personel Tanımları", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Personel Ekle", exact: true })
    .click();
  await page.getByLabel("Ad", { exact: true }).fill("Deniz");
  await page.getByLabel("Soyad", { exact: true }).fill("GizliSoyad");
  await page
    .getByLabel("Kullanıcı adı", { exact: true })
    .fill(`deniz-${suffix}`);
  await page.getByLabel("Giriş şifresi").fill("staff-e2e-password");
  await page.getByRole("button", { name: "Personeli Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Deniz GizliSoyad" }),
  ).toBeVisible();
  const roster = await api(
    "auth.people",
    { branch_id: branch.branch_id },
    "GET",
  );
  expect(roster).toHaveLength(1);
  expect(roster[0].name).toBe("Deniz");
  expect(JSON.stringify(roster)).not.toContain("GizliSoyad");
  await page
    .getByRole("button", { name: "Kat ve Oda Tanımları", exact: true })
    .click();
  await page.getByRole("button", { name: "Yatakları", exact: true }).click();
  await page.getByRole("button", { name: "Fiziksel Yatak Ekle" }).click();
  await page.getByLabel("Yatak kodu", { exact: true }).fill("R-501");
  await page.getByLabel("Yatak türü", { exact: true }).selectOption("bunk_bed");
  await page.getByLabel("Fiziksel yapı").selectOption("bunk");
  await page.getByLabel("Seviye sayısı").fill("3");
  await page.getByLabel("Kişi kapasitesi", { exact: true }).first().fill("2");
  await page.getByRole("button", { name: "Yatağı Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("4 kişi · 3 yatak yeri")).toBeVisible();
  await page
    .getByRole("button", { name: "Belge Şablonları", exact: true })
    .click();
  await page.getByLabel("Belge türü").selectOption("reservation_receipt");
  await page.getByRole("button", { name: "Örnek Metni Yükle" }).click();
  await page.getByRole("button", { name: "Şablonu Kaydet" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Şablon kaydedildi" }),
  ).toBeVisible();
  await page.getByLabel("Belge türü").selectOption("rental_contract");
  await page.getByRole("button", { name: "Örnek Metni Yükle" }).click();
  await expect(page.getByLabel("Belge metni")).toHaveValue(/Misafir Beyanı/);
  await page.getByRole("button", { name: "Şablonu Kaydet" }).click();
  const b = await api("booking.create", {
    branch_id: branch.branch_id,
    room_id: room.room_id,
    guest_name: "Ali Test",
    guest_count: 2,
    check_in: new Date(Date.now() - 3600000).toISOString(),
    check_out: new Date(Date.now() + 86400000).toISOString(),
    guests: [
      { name: "Ali Test", tcNo: `ALI-${suffix}` },
      { name: "Ayşe Test", tcNo: `AYSE-${suffix}` },
    ],
    notes: "",
  });
  await page.getByRole("button", { name: "Yenile", exact: true }).click();
  await page
    .getByRole("button", { name: "Rezervasyon Listesi", exact: true })
    .first()
    .click();
  const row = page.getByRole("row").filter({
    has: page.getByRole("button", { name: "Ali Test", exact: true }),
  });
  await row.getByRole("button", { name: "Giriş", exact: true }).click();
  await expect(row.getByText("Konaklıyor", { exact: true })).toBeVisible();
  await row.click({ button: "right" });
  await expect(
    page.getByRole("button", { name: "Dekont İşlemleri", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/context-menu.png" });
  await page
    .getByRole("button", { name: "Misafirleri Düzenle", exact: true })
    .click();
  await page.getByRole("button", { name: "Misafir Ekle", exact: true }).click();
  await page.getByLabel("3. Misafir Ad soyad").fill("Üçüncü Test");
  await page.getByLabel("3. Misafir Yakınlık").fill("Arkadaşı");
  await page.getByRole("button", { name: "Misafirleri Kaydet" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await row.click({ button: "right" });
  await page
    .getByRole("button", { name: "Kira Sözleşmesi", exact: true })
    .click();
  await page.getByRole("button", { name: "Önizle", exact: true }).click();
  await expect(page.locator("article").last()).toContainText("Üçüncü Test");
  await page.getByLabel("Belge türü").selectOption("reservation_receipt");
  await page.getByRole("button", { name: "Belgeyi Oluştur ve İndir" }).click();
  const documentDownload = page.waitForEvent("download");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Onayla" })
    .click();
  const documentFile = await documentDownload;
  await documentFile.saveAs("test-results/reservation.pdf");
  expect(
    (await readFile("test-results/reservation.pdf")).subarray(0, 5).toString(),
  ).toBe("%PDF-");
  await page.getByRole("button", { name: "Pencereyi kapat" }).click();
  await page
    .getByRole("button", { name: "Misafir Arama ve Geçmiş", exact: true })
    .click();
  await page.getByLabel("Misafir arama").fill("Ayşe");
  await expect(
    page.getByRole("button", { name: "Ayşe Test", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Üçüncü Test", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Giriş.*↓/ }).click();
  for (const [label, extension] of [
    ["Excel İndir", "xlsx"],
    ["PDF İndir", "pdf"],
  ]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    await (await download).saveAs(`test-results/guests.${extension}`);
  }
  expect(
    (await readFile("test-results/guests.xlsx")).subarray(0, 2).toString(),
  ).toBe("PK");
  expect(
    (await readFile("test-results/guests.pdf")).subarray(0, 5).toString(),
  ).toBe("%PDF-");
  await page
    .getByRole("button", { name: "Rezervasyon Listesi", exact: true })
    .first()
    .click();
  await row.getByRole("button", { name: "Çıkış", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Onayla" })
    .click();
  await expect(row.getByText("Çıkış yapıldı", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Kat ve Oda Tanımları", exact: true })
    .click();
  await page.getByRole("button", { name: "Bu Görünümdeki Tümünü Sil" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Onayla" })
    .click();
  await expect(
    page.getByText("Bu katta henüz birim tanımlanmamış."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sistem Logları", exact: true })
    .click();
  await page.getByLabel("İşlem", { exact: true }).selectOption("delete");
  await expect(
    page.getByRole("cell", { name: "room.delete_many", exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/hotel-logs.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Misafir Arama ve Geçmiş", exact: true })
    .click();
  await page.getByLabel("Misafir arama").fill("Ayşe");
  await expect(
    page.getByRole("button", { name: "Ayşe Test", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
