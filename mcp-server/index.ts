import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import Database from 'better-sqlite3'
import { z } from 'zod'
import path from 'path'
import { fileURLToPath } from 'url'
import { statSync, appendFileSync } from 'fs'

async function main() {
  const logFile = '/tmp/spherecast-mcp.log'
  const log = (msg: string) => {
    appendFileSync(logFile, new Date().toISOString() + ' ' + msg + '\n')
  }

  log('Starting MCP server...')
  const possiblePaths = [
    path.resolve(process.cwd(), 'backend/data/db.sqlite'),
    path.resolve(process.cwd(), '../backend/data/db.sqlite'),
    '/Users/luisreindlmeier/Desktop/spherecast/backend/data/db.sqlite',
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../backend/data/db.sqlite'
    ),
  ]

  let DB_PATH = ''
  for (const p of possiblePaths) {
    try {
      const stat = statSync(p, { throwIfNoEntry: false })
      if (stat) {
        DB_PATH = p
        break
      }
    } catch {}
  }

  if (!DB_PATH) {
    log('ERROR: Could not find db.sqlite')
    console.error('Could not find db.sqlite at any of:', possiblePaths)
    process.exit(1)
  }

  log(`DB_PATH resolved to: ${DB_PATH}`)

  const db = new Database(DB_PATH, { readonly: true })
  db.pragma('journal_mode = WAL')

  const server = new McpServer({
    name: 'spherecast-db',
    version: '1.0.0',
  })

  function fmt(rows: unknown): string {
    if (Array.isArray(rows) && rows.length === 0) return 'No results found.'
    return JSON.stringify(rows, null, 2)
  }

  server.registerTool(
    'search',
    {
      description:
        'Global search across companies, products, raw materials, suppliers, and ingredients. Returns matching results with type and ID.',
      inputSchema: z.object({
        query: z.string().describe('Search term (name, SKU, etc.)'),
      }),
    },
    ({ query }) => {
      const like = `%${query}%`
      const companies = db
        .prepare(
          "SELECT 'company' AS type, Id AS id, Name AS name FROM Company WHERE Name LIKE ? LIMIT 5"
        )
        .all(like)
      const suppliers = db
        .prepare(
          "SELECT 'supplier' AS type, Id AS id, Name AS name FROM Supplier WHERE Name LIKE ? LIMIT 5"
        )
        .all(like)
      const products = db
        .prepare(
          "SELECT 'product' AS type, p.Id AS id, p.SKU AS name, c.Name AS company FROM Product p JOIN Company c ON c.Id = p.CompanyId WHERE p.SKU LIKE ? LIMIT 5"
        )
        .all(like)
      const ingredients = db
        .prepare(
          "SELECT 'ingredient' AS type, Id AS id, Name AS name, FunctionalClass AS functional_class FROM IngredientProfile WHERE Name LIKE ? LIMIT 5"
        )
        .all(like)

      const results = [...companies, ...suppliers, ...products, ...ingredients]
      return { content: [{ type: 'text', text: fmt(results) }] }
    }
  )

  server.registerTool(
    'list_companies',
    {
      description:
        'List all companies with their ID, name, and product counts.',
      inputSchema: z.object({}),
    },
    () => {
      const rows = db
        .prepare(
          `SELECT c.Id, c.Name,
            COUNT(CASE WHEN p.Type='finished-good' THEN 1 END) AS finished_goods,
            COUNT(CASE WHEN p.Type='raw-material' THEN 1 END) AS raw_materials
           FROM Company c
           LEFT JOIN Product p ON p.CompanyId = c.Id
           GROUP BY c.Id ORDER BY c.Name`
        )
        .all()
      return { content: [{ type: 'text', text: fmt(rows) }] }
    }
  )

  server.registerTool(
    'get_company',
    {
      description:
        'Get details for a company: all finished goods and raw materials.',
      inputSchema: z.object({
        id: z.number().describe('Company ID'),
      }),
    },
    ({ id }) => {
      const company = db.prepare('SELECT * FROM Company WHERE Id = ?').get(id)
      if (!company)
        return { content: [{ type: 'text', text: 'Company not found.' }] }

      const products = db
        .prepare(
          'SELECT Id, SKU, Type FROM Product WHERE CompanyId = ? ORDER BY Type, SKU'
        )
        .all(id)

      return { content: [{ type: 'text', text: fmt({ company, products }) }] }
    }
  )

  server.registerTool(
    'list_suppliers',
    {
      description:
        'List all suppliers with their ID, name, material count, and facility count.',
      inputSchema: z.object({}),
    },
    () => {
      const rows = db
        .prepare(
          `SELECT s.Id, s.Name,
            COUNT(DISTINCT sp.ProductId) AS materials,
            COUNT(DISTINCT sf.Id) AS facilities
           FROM Supplier s
           LEFT JOIN Supplier_Product sp ON sp.SupplierId = s.Id
           LEFT JOIN SupplierFacility sf ON sf.SupplierId = s.Id
           GROUP BY s.Id ORDER BY s.Name`
        )
        .all()
      return { content: [{ type: 'text', text: fmt(rows) }] }
    }
  )

  server.registerTool(
    'get_supplier',
    {
      description:
        'Get details for a supplier: facilities, materials supplied (SKU + ingredient name), companies served, and rating.',
      inputSchema: z.object({
        id: z.number().describe('Supplier ID'),
      }),
    },
    ({ id }) => {
      const supplier = db.prepare('SELECT * FROM Supplier WHERE Id = ?').get(id)
      if (!supplier)
        return { content: [{ type: 'text', text: 'Supplier not found.' }] }

      const facilities = db
        .prepare(
          'SELECT FacilityName, Address, City, State, Country, FdaRegNumber FROM SupplierFacility WHERE SupplierId = ?'
        )
        .all(id)

      const materials = db
        .prepare(
          `SELECT p.Id, p.SKU, c.Name AS company, ip.Name AS ingredient, ip.FunctionalClass AS functional_class
           FROM Supplier_Product sp
           JOIN Product p ON p.Id = sp.ProductId
           JOIN Company c ON c.Id = p.CompanyId
           LEFT JOIN IngredientProfile ip ON lower(ip.Name) = lower(p.SKU)
           WHERE sp.SupplierId = ?
           ORDER BY c.Name, p.SKU`
        )
        .all(id)

      const rating = db
        .prepare(
          `SELECT sr.NormalizedName, sr.Rank, sr.Segment, sr.Certifications, sr.Materials
           FROM Map_Supplier_SupplierRating msr
           JOIN SupplierRating sr ON sr.Id = msr.SupplierRatingId
           WHERE msr.SupplierId = ?`
        )
        .get(id)

      return {
        content: [
          {
            type: 'text',
            text: fmt({
              supplier,
              rating: rating ?? null,
              facilities,
              materials,
            }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'get_product',
    {
      description:
        'Get details for a finished good: full bill of materials (which raw materials / ingredients it contains).',
      inputSchema: z.object({
        id: z.number().describe('Product ID'),
      }),
    },
    ({ id }) => {
      const product = db
        .prepare(
          'SELECT p.*, c.Name AS company FROM Product p JOIN Company c ON c.Id = p.CompanyId WHERE p.Id = ?'
        )
        .get(id)
      if (!product)
        return { content: [{ type: 'text', text: 'Product not found.' }] }

      const bom = db
        .prepare('SELECT Id FROM BOM WHERE ProducedProductId = ?')
        .get(id) as { Id: number } | undefined
      let components: unknown[] = []
      if (bom) {
        components = db
          .prepare(
            `SELECT p.Id, p.SKU,
              ip.Name AS ingredient, ip.FunctionalClass AS functional_class,
              ip.Vegan, ip.Kosher, ip.Halal, ip.NonGmo,
              ip.Allergens, ip.ENumber, ip.Confidence
             FROM BOM_Component bc
             JOIN Product p ON p.Id = bc.ConsumedProductId
             LEFT JOIN IngredientProfile ip ON lower(ip.Name) = lower(p.SKU)
             WHERE bc.BOMId = ?
             ORDER BY p.SKU`
          )
          .all(bom.Id)
      }

      return {
        content: [
          { type: 'text', text: fmt({ product, ingredients: components }) },
        ],
      }
    }
  )

  server.registerTool(
    'get_raw_material',
    {
      description:
        'Get details for a raw material: ingredient profile (vegan/kosher/halal/GMO/allergens), available suppliers, and which finished goods it appears in.',
      inputSchema: z.object({
        id: z.number().describe('Product ID of the raw material'),
      }),
    },
    ({ id }) => {
      const material = db
        .prepare(
          `SELECT p.*, c.Name AS company,
            ip.Name AS ingredient, ip.FunctionalClass AS functional_class,
            ip.Vegan, ip.Kosher, ip.Halal, ip.NonGmo,
            ip.Allergens, ip.ENumber, ip.Description,
            ip.Confidence, ip.Sources
           FROM Product p
           JOIN Company c ON c.Id = p.CompanyId
           LEFT JOIN IngredientProfile ip ON lower(ip.Name) = lower(p.SKU)
           WHERE p.Id = ? AND p.Type = 'raw-material'`
        )
        .get(id)
      if (!material)
        return { content: [{ type: 'text', text: 'Raw material not found.' }] }

      const suppliers = db
        .prepare(
          `SELECT s.Id, s.Name, sf.City, sf.Country, sf.FdaRegNumber
           FROM Supplier_Product sp
           JOIN Supplier s ON s.Id = sp.SupplierId
           LEFT JOIN SupplierFacility sf ON sf.SupplierId = s.Id
           WHERE sp.ProductId = ?
           ORDER BY s.Name`
        )
        .all(id)

      const used_in = db
        .prepare(
          `SELECT p.Id, p.SKU, c.Name AS company
           FROM BOM_Component bc
           JOIN BOM b ON b.Id = bc.BOMId
           JOIN Product p ON p.Id = b.ProducedProductId
           JOIN Company c ON c.Id = p.CompanyId
           WHERE bc.ConsumedProductId = ?
           ORDER BY c.Name, p.SKU`
        )
        .all(id)

      return {
        content: [
          { type: 'text', text: fmt({ material, suppliers, used_in }) },
        ],
      }
    }
  )

  server.registerTool(
    'get_ingredient_profile',
    {
      description:
        'Look up the regulatory profile of an ingredient: vegan, kosher, halal, non-GMO, allergens, E-number, synonyms, and confidence score.',
      inputSchema: z.object({
        name: z
          .string()
          .describe("Ingredient name (e.g. 'Sunflower Oil', 'Citric Acid')"),
      }),
    },
    ({ name }) => {
      const like = `%${name}%`
      const rows = db
        .prepare(
          `SELECT Id, Name, FunctionalClass, Allergens, Vegan, Kosher, Halal, NonGmo,
            ENumber, Description, Synonyms, Confidence, Sources
           FROM IngredientProfile
           WHERE Name LIKE ? OR Synonyms LIKE ?
           ORDER BY length(Name) LIMIT 10`
        )
        .all(like, like)

      if (rows.length === 0)
        return { content: [{ type: 'text', text: 'No ingredient found.' }] }
      return { content: [{ type: 'text', text: fmt(rows) }] }
    }
  )

  server.registerTool(
    'get_fda_compliance',
    {
      description:
        'Check FDA compliance information for a material: CFR citation, GRAS status, key requirements, and GMO disclosure obligations.',
      inputSchema: z.object({
        material: z.string().describe('Material or ingredient name'),
      }),
    },
    ({ material }) => {
      const like = `%${material}%`

      const standards = db
        .prepare(
          `SELECT Material, CfrCitation, GrasStatus, KeyRequirement, ContaminantLimits, ComplianceNotes
           FROM FdaStandard WHERE SearchKey LIKE ? OR Material LIKE ? LIMIT 5`
        )
        .all(like, like)

      const l1 = db
        .prepare(
          `SELECT Material, "FDA Regulatory Status", "21 CFR Citation", "Eligibility Criterion",
            "Auto-Disqualify If…", "PASS / FAIL"
           FROM Framework_L1_Eligibility WHERE SearchKey LIKE ? OR Material LIKE ? LIMIT 5`
        )
        .all(like, like)

      const l2 = db
        .prepare(
          `SELECT Material, "Quality / GMO Parameter", Unit,
            "FDA / FCC / NBFDS Minimum", "Your Acceptance Floor", "Test Method", "Status"
           FROM Framework_L2_Specs WHERE SearchKey LIKE ? OR Material LIKE ? LIMIT 10`
        )
        .all(like, like)

      const gmo = db
        .prepare(
          `SELECT "Crop / Substance", "Disclosure Required?", "Refined Ingredient Note (highly refined exemption)",
            "Non-GMO Verification Required For Claim", "EU Status (Reg EC 1829/2003)"
           FROM Framework_GmoDisclosure WHERE SearchKey LIKE ? OR "Crop / Substance" LIKE ? LIMIT 5`
        )
        .all(like, like)

      return {
        content: [
          {
            type: 'text',
            text: fmt({
              fda_standards: standards,
              l1_eligibility: l1,
              l2_specs: l2,
              gmo_disclosure: gmo,
            }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'get_single_source_risks',
    {
      description:
        'List all raw materials sourced from only a single supplier — critical supply chain concentration risk.',
      inputSchema: z.object({
        company_id: z
          .number()
          .optional()
          .describe('Optional: filter to a specific company'),
      }),
    },
    ({ company_id }) => {
      let sql = `
        SELECT p.Id AS product_id, p.SKU, c.Name AS company,
          COUNT(DISTINCT sp.SupplierId) AS supplier_count,
          GROUP_CONCAT(s.Name, ' | ') AS suppliers
        FROM Product p
        JOIN Company c ON c.Id = p.CompanyId
        JOIN Supplier_Product sp ON sp.ProductId = p.Id
        JOIN Supplier s ON s.Id = sp.SupplierId
        WHERE p.Type = 'raw-material'
      `
      const params: unknown[] = []
      if (company_id !== undefined) {
        sql += ' AND p.CompanyId = ?'
        params.push(company_id)
      }
      sql += ' GROUP BY p.Id HAVING supplier_count = 1 ORDER BY c.Name, p.SKU'

      const rows = db.prepare(sql).all(...params)
      return { content: [{ type: 'text', text: fmt(rows) }] }
    }
  )

  server.registerTool(
    'get_supplier_clients',
    {
      description:
        'Show which companies (brands) a supplier serves and which materials it delivers to each.',
      inputSchema: z.object({
        supplier_id: z.number().describe('Supplier ID'),
      }),
    },
    ({ supplier_id }) => {
      const rows = db
        .prepare(
          `SELECT DISTINCT c.Id AS company_id, c.Name AS company,
            COUNT(DISTINCT p.Id) AS materials,
            GROUP_CONCAT(DISTINCT p.SKU) AS skus
           FROM Supplier_Product sp
           JOIN Product p ON p.Id = sp.ProductId
           JOIN Company c ON c.Id = p.CompanyId
           WHERE sp.SupplierId = ?
           GROUP BY c.Id ORDER BY c.Name`
        )
        .all(supplier_id)
      return { content: [{ type: 'text', text: fmt(rows) }] }
    }
  )

  server.registerTool(
    'get_stats',
    {
      description: 'Overview of all data in the Spherecast database.',
      inputSchema: z.object({}),
    },
    () => {
      const stats = {
        companies: (
          db.prepare('SELECT COUNT(*) AS n FROM Company').get() as { n: number }
        ).n,
        finished_goods: (
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM Product WHERE Type='finished-good'"
            )
            .get() as { n: number }
        ).n,
        raw_materials: (
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM Product WHERE Type='raw-material'"
            )
            .get() as { n: number }
        ).n,
        suppliers: (
          db.prepare('SELECT COUNT(*) AS n FROM Supplier').get() as {
            n: number
          }
        ).n,
        facilities: (
          db.prepare('SELECT COUNT(*) AS n FROM SupplierFacility').get() as {
            n: number
          }
        ).n,
        supplier_product_links: (
          db.prepare('SELECT COUNT(*) AS n FROM Supplier_Product').get() as {
            n: number
          }
        ).n,
        bills_of_materials: (
          db.prepare('SELECT COUNT(*) AS n FROM BOM').get() as { n: number }
        ).n,
        ingredient_profiles: (
          db.prepare('SELECT COUNT(*) AS n FROM IngredientProfile').get() as {
            n: number
          }
        ).n,
        fda_standards: (
          db.prepare('SELECT COUNT(*) AS n FROM FdaStandard').get() as {
            n: number
          }
        ).n,
      }
      return { content: [{ type: 'text', text: fmt(stats) }] }
    }
  )

  const transport = new StdioServerTransport()
  log('Transport created, connecting...')
  await server.connect(transport)
  log('Server connected and ready')
}

main().catch((err) => {
  appendFileSync(
    '/tmp/spherecast-mcp.log',
    new Date().toISOString() + ' FATAL: ' + JSON.stringify(err) + '\n'
  )
  console.error('Fatal error:', err)
  process.exit(1)
})
