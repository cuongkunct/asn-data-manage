import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'asm_prod_secure_jwt_secret_key_2026_x89a';
const token = jwt.sign({ userId: 'test_admin', username: 'admin', role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

async function testLoginName() {
  const baseUrl = 'http://localhost:3001/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('1. Creating account with distinct accountName ("my_acc_test"), customerCode ("bb"), and loginName ("My_Login_User_123")...');
  const createRes = await fetch(`${baseUrl}/accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountName: 'my_acc_test',
      loginName: 'My_Login_User_123',
      customerCode: 'bb',
      code: 'my_code_123',
      systemId: 'viva88',
      supplierId: 'c9',
      productId: 'sportbooks',
      password: 'Pass123!@#'
    })
  });

  const created = await createRes.json();
  console.log('Create Response:', {
    status: createRes.status,
    accountId: created.accountId,
    accountName: created.accountName,
    customerCode: created.customerCode,
    loginName: created.loginName,
    code: created.code
  });

  if (created.accountName !== 'MY_ACC_TEST' || created.customerCode !== 'BB' || created.loginName !== 'My_Login_User_123') {
    throw new Error(`Save failed: expected accountName=MY_ACC_TEST, customerCode=BB, loginName=My_Login_User_123, got ${JSON.stringify(created)}`);
  }

  console.log('2. Fetching account by ID to verify DB persistence of loginName...');
  const getRes = await fetch(`${baseUrl}/accounts/${created.accountId}`, { headers });
  const fetched = await getRes.json();
  console.log('Fetched from DB:', {
    accountName: fetched.accountName,
    customerCode: fetched.customerCode,
    loginName: fetched.loginName,
    code: fetched.code
  });

  if (fetched.loginName !== 'My_Login_User_123') {
    throw new Error(`Persistence failed: expected loginName to be "My_Login_User_123", got "${fetched.loginName}"`);
  }

  console.log('3. Updating loginName to "  New_MixedCase_999  "...');
  const putRes = await fetch(`${baseUrl}/accounts/${created.accountId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      loginName: '  New_MixedCase_999  '
    })
  });
  const updated = await putRes.json();
  console.log('Update Response:', {
    loginName: updated.loginName,
    accountName: updated.accountName
  });

  if (updated.loginName !== 'New_MixedCase_999' || updated.accountName !== 'MY_ACC_TEST') {
    throw new Error('Update failed!');
  }

  console.log('4. Cleaning up test record...');
  await fetch(`${baseUrl}/accounts/${created.accountId}`, { method: 'DELETE', headers });
  console.log('✅ ALL LOGIN NAME PERSISTENCE TESTS PASSED!');
}

testLoginName().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
