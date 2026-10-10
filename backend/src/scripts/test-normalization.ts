import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'asm_prod_secure_jwt_secret_key_2026_x89a';
const token = jwt.sign({ userId: 'test_admin', username: 'admin', role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

async function testApi() {
  const baseUrl = 'http://localhost:3001/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('1. Testing POST /api/accounts with lowercase and untrimmed spaces...');
  const createRes = await fetch(`${baseUrl}/accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountName: '  case_test_acc_888  ',
      customerCode: '  cus_test_999  ',
      systemId: '  viva88  ',
      supplierId: '  c9  ',
      productId: '  sportbooks  ',
      password: 'MyPassword123!',
      code: '  test_code_888  ',
      subAccounts: [
        { id: 'sub_21', subName: 'Sub 21', username: '  sub_test_user  ', password: 'pwd' }
      ]
    })
  });

  const created = await createRes.json();
  console.log('Created Status:', createRes.status);
  console.log('Created Data:', {
    accountName: created.accountName,
    customerCode: created.customerCode,
    systemId: created.systemId,
    supplierId: created.supplierId,
    productId: created.productId,
    code: created.code,
    subAccount: created.subAccounts?.[0]
  });

  if (
    created.accountName !== 'CASE_TEST_ACC_888' ||
    created.customerCode !== 'CUS_TEST_999' ||
    created.systemId !== 'VIVA88' ||
    created.supplierId !== 'C9' ||
    created.productId !== 'SPORTBOOKS' ||
    created.subAccounts?.[0]?.username !== 'SUB_TEST_USER'
  ) {
    throw new Error('Normalization verification failed on save!');
  }
  console.log('✅ Save normalization: ALL UPPERCASE & TRIMMED confirmed!');

  console.log('2. Testing Duplicate Account Name Check with different case (CaSe_TeSt_AcC_888)...');
  const dupRes = await fetch(`${baseUrl}/accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountName: '  CaSe_TeSt_AcC_888  ',
      customerCode: 'CUS_001'
    })
  });
  console.log('Duplicate Check Status:', dupRes.status);
  const dupBody = await dupRes.json();
  console.log('Duplicate Check Response:', dupBody);
  if (dupRes.status !== 400) {
    throw new Error('Case-insensitive duplicate check failed!');
  }
  console.log('✅ Case-insensitive duplicate check confirmed!');

  console.log('3. Testing Case-Insensitive Search with lowercase query "case_test"...');
  const searchRes = await fetch(`${baseUrl}/accounts?search=case_test`, { headers });
  const searchData = await searchRes.json();
  const found = searchData.items.some((a: any) => a.accountName === 'CASE_TEST_ACC_888');
  console.log('Search match found:', found);
  if (!found) {
    throw new Error('Search case-insensitivity failed!');
  }
  console.log('✅ Case-insensitive search confirmed!');

  console.log('4. Cleaning up test record...');
  const delRes = await fetch(`${baseUrl}/accounts/${created.accountId}`, { method: 'DELETE', headers });
  console.log('Cleanup Status:', delRes.status);
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

testApi().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
